"use client";

import ScreenHeader from "../components/ScreenHeader";
import TabEnterMotion from "../components/TabEnterMotion";
import AdminScanner from "../components/AdminScanner";

export default function ScannerPage() {
  return (
    <TabEnterMotion className="flex flex-col gap-5">
      <ScreenHeader
        eyebrow="СКУД"
        title="Сканнер"
        subtitle="Контроль прохода на стадион"
      />
      <AdminScanner />
    </TabEnterMotion>
  );
}
