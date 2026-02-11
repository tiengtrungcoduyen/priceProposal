import { QuoteForm } from '@/components/quote-form';
import { Logo } from '@/components/logo';

export default function Home() {
  return (
    <main className="min-h-screen bg-background w-full flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-5xl mx-auto">
        <header className="flex flex-col sm:flex-row items-center gap-4 mb-8">
          <div className="bg-primary/10 p-3 rounded-lg border border-primary/20">
             <Logo className="h-10 w-10 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-foreground text-center sm:text-left">
              QuoteCraft
            </h1>
            <p className="text-muted-foreground mt-1 text-center sm:text-left">
              Nhập báo giá cho các vật tư được yêu cầu dưới đây.
            </p>
          </div>
        </header>
        <QuoteForm />
      </div>
    </main>
  );
}
