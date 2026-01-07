import ChatSidebar from "@/components/chat-sidebar";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <main className="flex">
      <ChatSidebar />
      <div className="flex-1">{children}</div>
    </main>
  );
}
