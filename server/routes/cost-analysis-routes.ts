/**
 * Maliyet Analizi API
 * Keyblend kuralı: Sadece RGM + admin keyblend bileşenlerini görür.
 * Overhead kaynağı: factoryCostSettings (muhasebe güncelleyebilir)
 * Sabit giderler: factoryFixedCosts (aylık kira, sigorta vb.)
 */

import { Router, Response } from "express";
import { db } from "../db";
import { factoryRecipes, factoryRecipeIngredients, inventory, factoryCostSettings, factoryFixedCosts } from "@shared/schema";
import { eq, sql } from "drizzle-orm";
import { isAuthenticated } from "../localAuth";
import type { AuthUser } from "../types/auth";

const router = Router();
const COST_ROLES = ["admin","ceo","cgo","muhasebe","muhasebe_ik","satinalma","recete_gm","gida_muhendisi","fabrika_mudur","uretim_sefi"];
const KEYBLEND_DETAIL_ROLES = ["admin","recete_gm"];
const SETTINGS_ROLES = ["admin","muhasebe","muhasebe_ik"];

const SALES_PRICES: Record<string,number> = {
  "DON-001":39.60,"CIN-001":51.47,"CIN-002":54.35,"CIN-003":54.35,
  "CHE-001":76,"CHE-002":76,"CHE-003":76,"CHE-004":76,"CHE-005":115.62,
  "BRW-001":49.50,"BRW-002":49.50,"COK-001":49.50,"COK-002":49.50,
  "EKM-001":49.50,"EKM-002":56.80,
};

const TOPPING_DEFAULTS: Record<string,{toppingGrams:number;toppingPriceKg:number;fillingGrams:number;fillingPriceKg:number;fryOilGrams:number}> = {
  "DON-001":{toppingGrams:10,toppingPriceKg:248.85,fillingGrams:12,fillingPriceKg:260,fryOilGrams:36},
  "default":{toppingGrams:0,toppingPriceKg:0,fillingGrams:0,fillingPriceKg:0,fryOilGrams:0},
};

const OH_DEFAULTS: Record<string,number> = {
  electricity_kwh_price:6,electricity_kwh_per_batch:57.82,
  personnel_hourly_rate:76.25,personnel_count:2,personnel_hours:2,fry_oil_price_kg:86.27,
};

function requireCost(req:any,res:any,next:any){
  const u=req.user as AuthUser;
  if(!u||!COST_ROLES.includes(u.role||""))return res.status(403).json({error:"Yetkiniz yok"});
  next();
}

async function getOverhead():Promise<Record<string,number>>{
  try{
    const s=await db.select().from(factoryCostSettings);
    const r={...OH_DEFAULTS};
    for(const x of s)r[x.settingKey]=Number(x.settingValue);
    return r;
  }catch{return OH_DEFAULTS;}
}

async function getKeyblendCost(recipeId:number):Promise<number>{
  try{
    const r=await db.execute(sql`
      SELECT COALESCE(SUM(fki.amount::numeric*COALESCE(i.market_price::numeric/NULLIF(i.conversion_factor::numeric,0),0)),0) as c
      FROM factory_recipe_ingredients fri
      JOIN factory_keyblend_ingredients fki ON fki.keyblend_id=fri.keyblend_id
      LEFT JOIN inventory i ON i.id=fki.raw_material_id
      WHERE fri.recipe_id=${recipeId} AND fri.ingredient_type='keyblend'`);
    return Number((r.rows?.[0] as any)?.c||0);
  }catch{return 0;}
}

// GET /api/cost-analysis/recipes
router.get("/api/cost-analysis/recipes",isAuthenticated,requireCost,async(req:any,res:Response)=>{
  try{
    const oh=await getOverhead();
    let fixedTotal=0;
    try{const fc=await db.select().from(factoryFixedCosts).where(eq(factoryFixedCosts.isActive,true));fixedTotal=fc.reduce((s,c)=>s+Number(c.monthlyAmount||0),0);}catch{}
    
    const recipes=await db.select({
      id:factoryRecipes.id,name:factoryRecipes.name,code:factoryRecipes.code,
      category:factoryRecipes.category,baseBatchOutput:factoryRecipes.baseBatchOutput,
      expectedUnitWeight:factoryRecipes.expectedUnitWeight,outputUnit:factoryRecipes.outputUnit,
    }).from(factoryRecipes).where(eq(factoryRecipes.isVisible,true)).orderBy(factoryRecipes.code);

    const results=[];
    for(const recipe of recipes){
      const ir=await db.execute(sql`
        SELECT COALESCE(SUM(CASE WHEN fri.ingredient_type!='keyblend' AND i.market_price IS NOT NULL
          THEN fri.amount::numeric*(i.market_price::numeric/NULLIF(i.conversion_factor::numeric,0)) ELSE 0 END),0) as ic,
        COUNT(*) FILTER(WHERE fri.ingredient_type!='keyblend') as ti,
        COUNT(*) FILTER(WHERE fri.ingredient_type!='keyblend' AND (fri.raw_material_id IS NULL OR i.market_price IS NULL OR i.market_price::numeric=0)) as mp
        FROM factory_recipe_ingredients fri LEFT JOIN inventory i ON i.id=fri.raw_material_id WHERE fri.recipe_id=${recipe.id}`);
      const d=(ir.rows?.[0] as any)||{};
      const ingredientCost=Number(d.ic||0);
      const kbCost=await getKeyblendCost(recipe.id);
      const elec=oh.electricity_kwh_per_batch*oh.electricity_kwh_price;
      const pers=oh.personnel_count*oh.personnel_hourly_rate*oh.personnel_hours;
      const td=TOPPING_DEFAULTS[recipe.code]||TOPPING_DEFAULTS["default"];
      const bo=recipe.baseBatchOutput||1;
      const topC=bo*(td.toppingGrams/1000)*td.toppingPriceKg;
      const filC=bo*(td.fillingGrams/1000)*td.fillingPriceKg;
      const oilC=td.fryOilGrams>0?bo*(td.fryOilGrams/1000)*oh.fry_oil_price_kg:0;
      const total=ingredientCost+kbCost+elec+pers+topC+filC+oilC;
      const uc=bo>0?total/bo:0;
      const sp=SALES_PRICES[recipe.code]||0;
      const profit=sp-uc;
      const margin=sp>0?(profit/sp*100):0;
      results.push({
        id:recipe.id,code:recipe.code,name:recipe.name,category:recipe.category,
        batchOutput:bo,outputUnit:recipe.outputUnit||"adet",unitWeight:recipe.expectedUnitWeight,
        ingredientCost:Math.round(ingredientCost*100)/100,
        keyblendCost:Math.round(kbCost*100)/100,
        overheadCost:Math.round((elec+pers)*100)/100,
        toppingCost:Math.round(topC*100)/100,fillingCost:Math.round(filC*100)/100,
        fryOilCost:Math.round(oilC*100)/100,
        totalBatchCost:Math.round(total*100)/100,unitCost:Math.round(uc*100)/100,
        sellingPrice:sp,profit:Math.round(profit*100)/100,margin:Math.round(margin*10)/10,
        totalIngredients:Number(d.ti||0),missingPrices:Number(d.mp||0),priceComplete:Number(d.mp||0)===0,
      });
    }
    res.json({
      recipes:results,
      summary:{
        totalRecipes:results.length,
        withSellingPrice:results.filter(r=>r.sellingPrice>0).length,
        allPricesComplete:results.filter(r=>r.priceComplete).length,
        avgMargin:results.filter(r=>r.margin>0).length>0?results.filter(r=>r.margin>0).reduce((s,r)=>s+r.margin,0)/results.filter(r=>r.margin>0).length:0,
        lowMarginProducts:results.filter(r=>r.margin>0&&r.margin<50).map(r=>({code:r.code,name:r.name,margin:r.margin})),
        monthlyFixedCosts:fixedTotal,
      },
      overhead:oh,
    });
  }catch(e){console.error("[CostAnalysis]",e);res.status(500).json({error:"Maliyet analizi yüklenemedi"});}
});

// GET /api/cost-analysis/recipe/:id — Keyblend gizliliği kontrollü
router.get("/api/cost-analysis/recipe/:id",isAuthenticated,requireCost,async(req:any,res:Response)=>{
  try{
    const user=req.user as AuthUser;
    const id=Number(req.params.id);
    const canSeeKB=KEYBLEND_DETAIL_ROLES.includes(user.role||"");
    const oh=await getOverhead();
    
    const [recipe]=await db.select().from(factoryRecipes).where(eq(factoryRecipes.id,id)).limit(1);
    if(!recipe)return res.status(404).json({error:"Reçete bulunamadı"});

    const ings=await db.execute(sql`
      SELECT fri.name as n,fri.amount as a,fri.unit as u,fri.ingredient_type as t,
        fri.raw_material_id as rid,fri.ingredient_category as cat,fri.keyblend_id as kid,
        i.code as ic,i.name as inv,i.market_price as mp,i.conversion_factor as cf,i.purchase_unit as pu
      FROM factory_recipe_ingredients fri LEFT JOIN inventory i ON i.id=fri.raw_material_id
      WHERE fri.recipe_id=${id} ORDER BY fri.sort_order`);

    const details:any[]=[];
    let ingCost=0;
    let kbCost=0;

    for(const ing of(ings.rows||[]) as any[]){
      const amt=Number(ing.a||0);const mp=Number(ing.mp||0);const cf=Number(ing.cf||1000);
      const ppu=cf>0?mp/cf:0;const cost=amt*ppu;const pkg=cf>0?(mp/cf*1000):0;

      if(ing.t==="keyblend"){
        kbCost=await getKeyblendCost(id);
        details.push({name:ing.n,amount:amt,unit:ing.u,type:"keyblend",category:ing.cat,
          cost:Math.round(kbCost*100)/100,isKeyblend:true,keyblendDetailsHidden:!canSeeKB});
      }else{
        ingCost+=cost;
        details.push({name:ing.n,amount:amt,unit:ing.u,type:ing.t,category:ing.cat,
          inventoryCode:ing.ic,inventoryName:ing.inv,marketPrice:mp,conversionFactor:cf,
          pricePerKg:Math.round(pkg*100)/100,cost:Math.round(cost*100)/100,
          hasMissingPrice:ing.rid&&mp<=0});
      }
    }

    // Keyblend bileşen detayları — SADECE RGM/admin
    let kbIngredients:any[]=[];
    if(canSeeKB){
      const kr=await db.execute(sql`
        SELECT fki.name,fki.amount,fki.unit,i.code as ic,i.market_price as mp,i.conversion_factor as cf
        FROM factory_recipe_ingredients fri
        JOIN factory_keyblend_ingredients fki ON fki.keyblend_id=fri.keyblend_id
        LEFT JOIN inventory i ON i.id=fki.raw_material_id
        WHERE fri.recipe_id=${id} AND fri.ingredient_type='keyblend' ORDER BY fki.sort_order`);
      kbIngredients=((kr.rows||[]) as any[]).map((k:any)=>{
        const a=Number(k.amount);const mp=Number(k.mp||0);const cf=Number(k.cf||1000);
        return{name:k.name,amount:a,unit:k.unit,inventoryCode:k.ic,
          pricePerKg:cf>0?Math.round(mp/cf*1000*100)/100:0,
          cost:cf>0?Math.round(a*mp/cf*100)/100:0};
      });
    }

    const elec=oh.electricity_kwh_per_batch*oh.electricity_kwh_price;
    const pers=oh.personnel_count*oh.personnel_hourly_rate*oh.personnel_hours;
    const td=TOPPING_DEFAULTS[recipe.code]||TOPPING_DEFAULTS["default"];
    const bo=recipe.baseBatchOutput||1;
    const topC=bo*(td.toppingGrams/1000)*td.toppingPriceKg;
    const filC=bo*(td.fillingGrams/1000)*td.fillingPriceKg;
    const oilC=td.fryOilGrams>0?bo*(td.fryOilGrams/1000)*oh.fry_oil_price_kg:0;
    const total=ingCost+kbCost+elec+pers+topC+filC+oilC;
    const uc=bo>0?total/bo:0;
    const sp=SALES_PRICES[recipe.code]||0;

    res.json({
      recipe:{id:recipe.id,code:recipe.code,name:recipe.name,category:recipe.category,
        batchOutput:bo,outputUnit:recipe.outputUnit,unitWeight:recipe.expectedUnitWeight},
      ingredients:details,
      keyblendIngredients:kbIngredients,
      canSeeKeyblendDetails:canSeeKB,
      costs:{ingredientCost:Math.round(ingCost*100)/100,keyblendCost:Math.round(kbCost*100)/100,
        electricityCost:Math.round(elec*100)/100,personnelCost:Math.round(pers*100)/100,
        toppingCost:Math.round(topC*100)/100,fillingCost:Math.round(filC*100)/100,
        fryOilCost:Math.round(oilC*100)/100,totalBatchCost:Math.round(total*100)/100,
        unitCost:Math.round(uc*100)/100},
      pricing:{sellingPrice:sp,profit:Math.round((sp-uc)*100)/100,
        margin:sp>0?Math.round((sp-uc)/sp*1000)/10:0,kdvRate:1,
        sellingPriceWithKdv:Math.round(sp*1.01*100)/100},
      overhead:{electricityKwh:oh.electricity_kwh_per_batch,electricityPrice:oh.electricity_kwh_price,
        personnelCount:oh.personnel_count,personnelHours:oh.personnel_hours,
        personnelHourlyRate:oh.personnel_hourly_rate},
      toppingFilling:td,
    });
  }catch(e){console.error("[CostAnalysis]",e);res.status(500).json({error:"Maliyet detayı yüklenemedi"});}
});

// GET/PUT /api/cost-analysis/settings — Muhasebe ayar yönetimi
router.get("/api/cost-analysis/settings",isAuthenticated,requireCost,async(_req:any,res:Response)=>{
  try{
    const settings=await db.select().from(factoryCostSettings);
    let fixedCosts:any[]=[];
    try{fixedCosts=await db.select().from(factoryFixedCosts).where(eq(factoryFixedCosts.isActive,true));}catch{}
    res.json({settings,fixedCosts,defaults:OH_DEFAULTS});
  }catch(e){res.status(500).json({error:"Ayarlar yüklenemedi"});}
});

router.put("/api/cost-analysis/settings",isAuthenticated,async(req:any,res:Response)=>{
  try{
    const u=req.user as AuthUser;
    if(!SETTINGS_ROLES.includes(u.role||""))return res.status(403).json({error:"Sadece muhasebe"});
    const{settings}=req.body;
    if(!Array.isArray(settings))return res.status(400).json({error:"settings array gerekli"});
    for(const s of settings){
      const[ex]=await db.select().from(factoryCostSettings).where(eq(factoryCostSettings.settingKey,s.key)).limit(1);
      if(ex)await db.update(factoryCostSettings).set({settingValue:String(s.value),updatedAt:new Date()}).where(eq(factoryCostSettings.id,ex.id));
      else await db.insert(factoryCostSettings).values({settingKey:s.key,settingValue:String(s.value),description:s.description||""});
    }
    res.json({success:true,updated:settings.length});
  }catch(e){res.status(500).json({error:"Ayarlar güncellenemedi"});}
});

// POST /api/cost-analysis/fixed-costs — Sabit gider ekle
router.post("/api/cost-analysis/fixed-costs",isAuthenticated,async(req:any,res:Response)=>{
  try{
    const u=req.user as AuthUser;
    if(!SETTINGS_ROLES.includes(u.role||""))return res.status(403).json({error:"Sadece muhasebe"});
    const{category,name,monthlyAmount,description,allocationMethod}=req.body;
    const[c]=await db.insert(factoryFixedCosts).values({
      category,name,description,monthlyAmount:String(monthlyAmount),
      annualAmount:String(Number(monthlyAmount)*12),
      allocationMethod:allocationMethod||"production_volume",isRecurring:true,isActive:true,
    }).returning();
    res.json(c);
  }catch(e){res.status(500).json({error:"Sabit gider eklenemedi"});}
});

// GET /api/cost-analysis/profit-summary — Kategori bazlı kâr özeti
router.get("/api/cost-analysis/profit-summary", isAuthenticated, requireCost, async (req: any, res: Response) => {
  try {
    const SALES: Record<string, number> = {
      "DON-001": 39.60, "CIN-001": 54.35, "CIN-002": 54.35, "CIN-003": 54.35,
      "CHE-001": 76, "CHE-002": 76, "CHE-003": 76, "CHE-004": 76, "CHE-005": 115.62,
      "BRW-001": 49.50, "BRW-002": 49.50, "COK-001": 49.50, "COK-002": 49.50,
      "EKM-001": 49.50, "EKM-002": 56.80,
    };
    const recipes = await db.select({
      id: factoryRecipes.id, code: factoryRecipes.code, name: factoryRecipes.name,
      category: factoryRecipes.category, baseBatchOutput: factoryRecipes.baseBatchOutput,
    }).from(factoryRecipes).where(eq(factoryRecipes.isVisible, true));

    const catStats: Record<string, { count: number; totalMargin: number; revenue: number; cost: number }> = {};
    for (const r of recipes) {
      const sp = SALES[r.code] || 0;
      if (sp <= 0) continue;
      const costRows = await db.execute(sql`
        SELECT COALESCE(SUM(CASE WHEN fri.ingredient_type != 'keyblend' AND i.market_price IS NOT NULL
          THEN fri.amount::numeric * (i.market_price::numeric / NULLIF(i.conversion_factor::numeric, 0)) ELSE 0 END), 0) as tc
        FROM factory_recipe_ingredients fri LEFT JOIN inventory i ON i.id = fri.raw_material_id
        WHERE fri.recipe_id = ${r.id}`);
      const bc = Number((costRows.rows?.[0] as any)?.tc || 0);
      const uc = bc / (r.baseBatchOutput || 1);
      const margin = (sp - uc) / sp * 100;
      const cat = r.category || "diger";
      if (!catStats[cat]) catStats[cat] = { count: 0, totalMargin: 0, revenue: 0, cost: 0 };
      catStats[cat].count++;
      catStats[cat].totalMargin += margin;
      catStats[cat].revenue += sp;
      catStats[cat].cost += uc;
    }
    res.json({
      categories: Object.entries(catStats).map(([cat, s]) => ({
        category: cat, productCount: s.count,
        avgMargin: Math.round(s.totalMargin / s.count * 10) / 10,
        avgRevenue: Math.round(s.revenue / s.count * 100) / 100,
        avgCost: Math.round(s.cost / s.count * 100) / 100,
      })),
    });
  } catch (e) {
    console.error("[CostAnalysis] profit-summary error:", e);
    res.status(500).json({ error: "Kâr özeti yüklenemedi" });
  }
});

export default router;
