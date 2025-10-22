"use client";
import { usePrivy } from "@privy-io/react-auth";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const {
    ready: IsProviderReady,
    authenticated,
    user,
    login,
    logout,
  } = usePrivy();

  if (!IsProviderReady) {
    return (
      <div>
        <div> Loading privvy hook..</div>
        <div></div>
      </div>
    );
  }
  console.log(`status`, authenticated);
  console.log(`user`, user);
  return (
    <div className="h-screen flex bg-white max-w-7xl mx-auto max-h-[1200px]">
      {/* Left Section - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-violet-50 to-white flex-col justify-between p-12">
        <div className="space-y-8 mt-20">
          <div>
            <h1 className="text-5xl font-bold text-foreground mb-6 leading-tight">
              Welcome back to your workspace
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Securely access your account with email verification. We keep your
              data safe with industry-leading security standards.
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-violet-600 flex items-center justify-center flex-shrink-0 mt-1">
                <span className="text-white text-sm font-semibold">✓</span>
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-1">
                  Instant Access
                </h3>
                <p className="text-muted-foreground">
                  Get started in seconds with email verification
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-violet-600 flex items-center justify-center flex-shrink-0 mt-1">
                <span className="text-white text-sm font-semibold">✓</span>
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-1">
                  Secure & Private
                </h3>
                <p className="text-muted-foreground">
                  Your data is encrypted and protected at all times
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-violet-600 flex items-center justify-center flex-shrink-0 mt-1">
                <span className="text-white text-sm font-semibold">✓</span>
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-1">
                  24/7 Support
                </h3>
                <p className="text-muted-foreground">
                  Our team is always here to help you succeed
                </p>
              </div>
            </div>
          </div>
        </div>

        <p className="text-sm text-muted-foreground">
          © 2025 AppName. All rights reserved.
        </p>
      </div>
      {authenticated ? (
        <div>
          <Button>Wallet is Connected</Button>
          <Button
            onClick={() => {
              logout();
            }}
            variant={"destructive"}
            className="cursor-pointer"
          >
            Disconnect
          </Button>
        </div>
      ) : (
        <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 bg-white">
          <div className="w-full max-w-md">
            <Button
              onClick={() => {
                login();
              }}
            >
              Connect Wallet
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
