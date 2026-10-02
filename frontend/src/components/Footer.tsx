import { Link } from "react-router-dom";
export default function Footer() {
  return (
    <footer className="mt-20 bg-sage-dark text-white">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-12 md:grid-cols-[1.5fr_1fr_1fr] lg:px-8">
        <div>
          <Link to="/" className="font-display text-2xl">
            stay<span className="text-gold">inn</span>
          </Link>
          <p className="mt-4 max-w-xs text-sm leading-6 text-white/65">
            Thoughtfully designed stays for people who value time well spent.
          </p>
        </div>
        <div>
          <p className="mb-4 text-xs font-bold uppercase tracking-widest text-gold">
            Explore
          </p>
          <div className="grid gap-3 text-sm text-white/70">
            <Link to="/rooms">Our rooms</Link>
            <Link to="/login">Sign in</Link>
            <Link to="/register">Create account</Link>
          </div>
        </div>
        <div>
          <p className="mb-4 text-xs font-bold uppercase tracking-widest text-gold">
            Contact
          </p>
          <p className="text-sm leading-6 text-white/70">
            hello@stayinn.com
            <br />
            +1 (555) 014-2024
          </p>
        </div>
      </div>
      <div className="border-t border-white/10 px-5 py-5 text-center text-xs text-white/50">
        © 2025 StayInn. Made for slow mornings.
      </div>
    </footer>
  );
}
