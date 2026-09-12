import Header from "@/components/Header";
import Mosaic from "@/components/Mosaic";
import FilmStrip from "@/components/FilmStrip";
import Cv from "@/components/Cv";
import Contact from "@/components/Contact";
import { LightboxProvider } from "@/components/Lightbox";

export default function Index() {

  return (
    <div className="portfolio-shell">
      <LightboxProvider>
        <Header />
        <main>
          <FilmStrip />
          <Mosaic />
          <Cv />
          <Contact />
        </main>
      </LightboxProvider>
    </div>
  );
}
