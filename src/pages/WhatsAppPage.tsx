import WhatsAppLayout from "@/components/whatsapp/WhatsAppLayout";

export default function WhatsAppPage() {
  return (
    <div className="h-[calc(100vh-4rem)] overflow-hidden rounded-lg" style={{ border: "1px solid var(--wa-border)" }}>
      <WhatsAppLayout />
    </div>
  );
}
