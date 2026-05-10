import { Metadata } from "next";
import { RouteListClient } from "./route-list-client";

export const metadata: Metadata = {
  title: "Routes | TransLogiX",
  description: "Manage transport routes",
};

export default function RoutesPage() {
  return <RouteListClient />;
}
