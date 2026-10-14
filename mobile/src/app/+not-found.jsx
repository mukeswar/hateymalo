import React from "react";
import { router } from "expo-router";
import { Compass } from "lucide-react-native";
import { Screen, EmptyState } from "../components/ui";

export default function NotFound() {
  return (
    <Screen>
      <EmptyState icon={Compass} title="Page not found" message="This link does not lead anywhere in Hateymalo." action="Go home" onAction={() => router.replace("/")} />
    </Screen>
  );
}
