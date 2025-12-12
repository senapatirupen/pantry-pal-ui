import { useLocation } from "wouter";

export default function PrivacyPolicy() {
    const [, setLocation] = useLocation();

    return (
        <div>
            <div className="min-h-screen bg-muted/30">
                {/* Header */}
                <header className="sticky top-0 z-50 bg-white border-b border-muted">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h1 className="font-serif text-2xl font-bold text-foreground">FinanceTBag</h1>
                                <p className="text-sm text-muted-foreground">Tracking every item protects your money.</p>
                            </div>
                        </div>
                    </div>
                </header>
            </div>
            <div className="max-w-4xl mx-auto px-4 py-10 space-y-4">
                <h1 className="text-2xl font-bold">Privacy Policy</h1>

                <p className="text-muted-foreground">
                    We respect your privacy. All personal data, inventory details, and usage information
                    are securely stored and never shared with third parties without consent.
                </p>

                <p className="text-muted-foreground">
                    Authentication information is encrypted and protected using industry-standard security practices.
                </p>
            </div>
            <div className="min-h-screen bg-muted/30">
                {/* Footer */}
                <footer className="border-t border-muted bg-white mt-12">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                            {/* Left: Copyright */}
                            <p className="text-sm text-muted-foreground text-center md:text-left">
                                © {new Date().getFullYear()} FinanceTBag. All rights reserved.
                            </p>
                            {/* Right: Links */}
                            <span onClick={() => setLocation("/")} className="cursor-pointer hover:text-foreground">
                                Home
                            </span>
                        </div>
                    </div>
                </footer>
            </div>
        </div>
    );
}
