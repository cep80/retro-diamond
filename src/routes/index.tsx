import { createFileRoute } from "@tanstack/react-router";
import { ShineApp } from "@/components/ShineApp";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return <ShineApp />;
}
