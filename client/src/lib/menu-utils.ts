import { queryClient } from "./queryClient";

export function invalidateMenuCache() {
  queryClient.invalidateQueries({ queryKey: ["sidebar-menu"] });
}
