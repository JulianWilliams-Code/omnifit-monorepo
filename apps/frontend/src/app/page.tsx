import { Button } from '@omnifit/ui';
import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-spiritual-50 to-fitness-50">
      {/* Header */}
      <header className="container mx-auto px-4 py-6">
        <nav className="flex items-center justify-between">
          <div className="text-2xl font-bold text-gradient-primary">
            OmniFit
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost">Login</Button>
            </Link>
            <Link href="/register">
              <Button>Get Started</Button>
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-4">
        <div className="text-center py-20">
          <h1 className="text-6xl font-bold mb-6">
            Faith{' '}
            <span className="text-gradient-spiritual">+</span>{' '}
            Fitness{' '}
            <span className="text-gradient-fitness">+</span>{' '}
            <span className="text-gradient-primary">Rewards</span>
          </h1>
          
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Transform your spiritual and physical journey with blockchain-powered rewards. 
            Earn OMF tokens for every workout, meditation, prayer, and act of service.
          </p>

          <div className="flex items-center justify-center gap-4 mb-16">
            <Link href="/register">
              <Button size="xl" className="shadow-glow">
                Start Your Journey
              </Button>
            </Link>
            <Link href="/about">
              <Button size="xl" variant="outline">
                Learn More
              </Button>
            </Link>
          </div>

          {/* Feature Cards */}
          <div className="grid md:grid-cols-3 gap-8 mt-20">
            <div className="bg-white/50 backdrop-blur-sm rounded-xl p-8 border border-fitness-200">
              <div className="text-4xl mb-4">💪</div>
              <h3 className="text-xl font-semibold mb-2 text-gradient-fitness">
                Fitness Rewards
              </h3>
              <p className="text-muted-foreground">
                Earn tokens for every minute of physical activity. 
                Track workouts, build streaks, achieve milestones.
              </p>
            </div>

            <div className="bg-white/50 backdrop-blur-sm rounded-xl p-8 border border-spiritual-200">
              <div className="text-4xl mb-4">🙏</div>
              <h3 className="text-xl font-semibold mb-2 text-gradient-spiritual">
                Spiritual Growth
              </h3>
              <p className="text-muted-foreground">
                Get rewarded for meditation, prayer, study, and service. 
                Nurture your faith while earning tokens.
              </p>
            </div>

            <div className="bg-white/50 backdrop-blur-sm rounded-xl p-8 border border-primary-200">
              <div className="text-4xl mb-4">🪙</div>
              <h3 className="text-xl font-semibold mb-2 text-gradient-primary">
                Blockchain Rewards
              </h3>
              <p className="text-muted-foreground">
                Real tokens on Solana blockchain. Trade, stake, or redeem 
                with our partner network.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-8 mt-20 border-t">
        <div className="text-center text-muted-foreground">
          <p>&copy; 2024 OmniFit. Building the future of faith + fitness rewards.</p>
        </div>
      </footer>
    </div>
  );
}