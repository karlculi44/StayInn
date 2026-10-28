import { ButtonLink } from "../../components/ui/Button";

const principles = [
  {
    number: "01",
    title: "Comfort without the fuss",
    description:
      "A calm, welcoming place to settle in, with the essentials thoughtfully taken care of.",
  },
  {
    number: "02",
    title: "Thoughtful details",
    description:
      "From a good night's rest to an easy arrival, the small things help make a stay feel right.",
  },
  {
    number: "03",
    title: "A stay your way",
    description:
      "Find a room that suits your trip and enjoy the freedom to make the stay your own.",
  },
];

export default function About() {
  return (
    <>
      <section className="bg-sage-dark text-white">
        <div className="mx-auto max-w-7xl px-5 py-20 lg:px-8 lg:py-28">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-gold">
            About StayInn
          </p>
          <h1 className="mt-4 max-w-3xl font-display text-4xl leading-tight sm:text-6xl">
            A more thoughtful way to stay.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-white/75">
            StayInn is a calm, comfortable place in the heart of the city.
            We believe a good stay is made of the things that matter: a warm
            welcome, a restful room, and details that make it easy to feel at
            home.
          </p>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-10 px-5 py-16 lg:grid-cols-[0.8fr_1.2fr] lg:px-8 lg:py-20">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold">
            Our approach
          </p>
          <h2 className="mt-3 font-display text-3xl sm:text-4xl">
            Make room for a better stay.
          </h2>
        </div>
        <div className="space-y-5 text-muted leading-7">
          <p>
            Whether you are visiting for a quick city break or taking time to
            recharge, your stay should feel simple from the moment you arrive.
            Our rooms are designed for comfort, and our team is here to help
            make the practical parts of travel feel easy.
          </p>
          <p>
            We keep our focus on warm hospitality and the thoughtful
            essentials—so you can spend less time figuring things out and more
            time enjoying your stay.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-16 lg:px-8 lg:pb-20">
        <div className="grid gap-8 rounded-3xl bg-(--app-sage-tint) p-8 sm:p-12 md:grid-cols-3">
          {principles.map((principle) => (
            <article key={principle.number}>
              <p className="font-display text-3xl text-sage">
                {principle.number}
              </p>
              <h3 className="mt-4 font-semibold text-ink">
                {principle.title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-muted">
                {principle.description}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-8 lg:px-8">
        <div className="flex flex-col items-start justify-between gap-6 rounded-3xl bg-sage-dark p-8 text-white sm:p-12 md:flex-row md:items-center">
          <div>
            <h2 className="font-display text-3xl">Your stay starts here.</h2>
            <p className="mt-2 text-white/75">
              Explore our rooms and find the right space for your visit.
            </p>
          </div>
          <ButtonLink
            to="/rooms"
            variant="ghost"
            className="bg-white text-sage hover:bg-sage hover:text-white"
          >
            Explore rooms
          </ButtonLink>
        </div>
      </section>
    </>
  );
}
