import Link from 'next/link';

export default function PanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b">
        <nav className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/panel" className="text-xl font-semibold">
              Zinc Wrapper
            </Link>
            <div className="flex gap-6">
              <Link href="/panel" className="hover:text-primary">
                Add Product
              </Link>
              <Link href="/panel/orders" className="hover:text-primary">
                Orders
              </Link>
            </div>
          </div>
        </nav>
      </header>
      <main className="flex-1 container mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
}