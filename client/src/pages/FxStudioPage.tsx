import { Layout } from "@/components/layout/Layout";
import { EmbeddedFxStudio } from "@/components/EmbeddedFxStudio";
import { useLocation } from "wouter";
import { useCallback } from "react";

export default function FxStudioPage() {
  const [, navigate] = useLocation();

  const handleClose = useCallback(() => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      navigate("/");
    }
  }, [navigate]);

  return (
    <>
      <EmbeddedFxStudio
        onClose={handleClose}
        onAssetsUpdated={() => {}}
        initialMode="fx"
      />
    </>
  );
}
