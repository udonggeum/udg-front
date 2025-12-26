import { Header } from "@/components/layout/header";

export default function ChatsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Header />
      <div className="min-h-screen pb-0">
        {children}
      </div>
    </>
  );
}
