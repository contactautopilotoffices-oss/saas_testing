import HeroSection from '@/components/landing/HeroSection';
import BuildingStory from '@/components/landing/BuildingStory';

export default function Home() {
    return (
        <main className="flex flex-col min-h-screen bg-black overflow-x-hidden">
            <HeroSection />
            <BuildingStory />
        </main>
    );
}
