import { BranchStatusWidget } from "./BranchStatusWidget";
import { SLATrackerWidget } from "./SLATrackerWidget";
import { OpenTicketsWidget } from "./OpenTicketsWidget";
import { TodaysTasksDynamicWidget } from "./TodaysTasksWidget";
import { StaffOverviewWidget } from "./StaffOverviewWidget";
import { LeaveTrackerWidget } from "./LeaveTrackerWidget";
import { IKSummaryWidget } from "./IKSummaryWidget";
import { FactoryProductionWidget } from "./FactoryProductionWidget";
import { QCStatsWidget } from "./QCStatsWidget";
import { PendingShipmentsWidget } from "./PendingShipmentsWidget";
import { FinancialOverviewWidget } from "./FinancialOverviewWidget";
import { PendingOrdersWidget } from "./PendingOrdersWidget";
import { TrainingProgressWidget } from "./TrainingProgressWidget";
import { CRMSummaryWidget } from "./CRMSummaryWidget";
import { EquipmentFaultsWidget } from "./EquipmentFaultsWidget";
import { EquipmentMaintenanceWidget } from "./EquipmentMaintenanceWidget";
import { QuickActionsWidget } from "./QuickActionsWidget";
import { CustomerFeedbackWidget } from "./CustomerFeedbackWidget";
import { AIBriefingWidget } from "./AIBriefingWidget";
import { GenericStatWidget } from "./GenericStatWidget";

interface WidgetData {
  key: string;
  title: string;
  type: string;
  size: string;
  category: string;
  componentKey: string;
  order: number;
  defaultOpen: boolean;
  data: any;
}

interface Props {
  widget: WidgetData;
}

const widgetMap: Record<string, (props: { data: any }) => JSX.Element | null> = {
  branch_status: ({ data }) => <BranchStatusWidget data={data} />,
  sla_tracker: ({ data }) => <SLATrackerWidget data={data} />,
  open_tickets: ({ data }) => <OpenTicketsWidget data={data} />,
  todays_tasks: ({ data }) => <TodaysTasksDynamicWidget data={data} />,
  staff_count: ({ data }) => <StaffOverviewWidget data={data} />,
  leave_requests: ({ data }) => <LeaveTrackerWidget data={data} />,
  ik_summary: ({ data }) => <IKSummaryWidget data={data} />,
  factory_production: ({ data }) => <FactoryProductionWidget data={data} />,
  qc_stats: ({ data }) => <QCStatsWidget data={data} />,
  pending_shipments: ({ data }) => <PendingShipmentsWidget data={data} />,
  financial_overview: ({ data }) => <FinancialOverviewWidget data={data} />,
  pending_orders: ({ data }) => <PendingOrdersWidget data={data} />,
  training_progress: ({ data }) => <TrainingProgressWidget data={data} />,
  customer_feedback: ({ data }) => <CustomerFeedbackWidget data={data} />,
  crm_summary: ({ data }) => <CRMSummaryWidget data={data} />,
  equipment_faults: ({ data }) => <EquipmentFaultsWidget data={data} />,
  equipment_maintenance: ({ data }) => <EquipmentMaintenanceWidget data={data} />,
  quick_actions: ({ data }) => <QuickActionsWidget data={data} />,
  ai_briefing: ({ data }) => <AIBriefingWidget data={data} />,
};

export function WidgetRenderer({ widget }: Props) {
  const Renderer = widgetMap[widget.key] || widgetMap[widget.componentKey];
  if (Renderer) {
    return <Renderer data={widget.data} />;
  }
  return <GenericStatWidget title={widget.title} data={widget.data} />;
}

export type { WidgetData };
