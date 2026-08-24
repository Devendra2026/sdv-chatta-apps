import AnnouncementTicker from "@/components/home/AnnouncementTicker"
import ChairmanMessage from "@/components/home/ChairmanMessage"
import CitizenServices from "@/components/home/CitizenServices"
import DigitalGateway from "@/components/home/DigitalGateway"
import HeroSlider from "@/components/home/HeroSlider"
import Statistics from "@/components/home/Statistics"
import DignitariesSection from "@/components/home/dignitariesSection"
import Portals from "@/components/home/portals"
import Galleryslider from "@/components/home/galleryslider"
import Complain from "@/components/home/complain"


export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <HeroSlider />
      <AnnouncementTicker />
      <div className="bg-gradient-flag">
        <DigitalGateway />
        <CitizenServices />
        <ChairmanMessage />
      </div>
      <Statistics />
      <DignitariesSection />
      <Portals />
      <Galleryslider />
      <Complain />
    </div>
  )
}
