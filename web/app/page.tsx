import BackgroundField from "@/components/background";
import HomePage from "@/components/HomePage";

const Page = () => {
  return (
    <>
      <div className="relative min-h-screen w-full bg-[#0a0b10] text-white overflow-hidden">
        {/* Animated Football Background Layer */}
        <BackgroundField />

        {/* Page Content */}
        <main className="relative z-10  px-4 md:px-8 max-w-7xl mx-auto mt-10">
          <HomePage />
        </main>
      </div>
    </>
  );
};

export default Page;
