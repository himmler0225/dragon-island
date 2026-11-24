/* eslint-disable @next/next/no-img-element -- game art from /public, sized by CSS */
import Link from "next/link";
import { Footer, TopBar } from "@/components";
import { BUILDING_NAME, ISLANDS, PRODUCES, RESOURCE_NAME, type BuildingType } from "@/game/config";
import { SKILLS, skillIconUrl } from "@/game/skills";
import { SPECIES, SPECIES_INFO, portraitUrl, type SpeciesId } from "@/game/config";
import styles from "./home.module.css";

const DRAGON_BLURB: Record<SpeciesId, string> = {
  qilin: "Linh thú điềm lành mình đỏ giáp vàng. Há miệng khạc ra đầu rồng vàng xuyên thủng cả đội hình địch.",
  sea_dragon: "Việt Hải Long Vương, rồng biển xanh bờm lửa với chóp đuôi lửa xanh. Đứng đầu Ngũ Hải Long Vương.",
  jade_flame_dragon: "Rồng con lửa cam với đôi mắt xanh lục. Bay lên lơ lửng rồi khạc ra ngọn lửa xanh lá thiêu đốt kẻ địch.",
  fire_spirit_boss: "Hỏa Linh, boss lửa của chiến trường.",
  ruby_dragon: "Rồng con đỏ thắm bụng vàng, ngực gắn lam ngọc, đôi cánh lông vũ trắng và đuôi quạt băng. Phóng mảnh hồng ngọc, gọi tinh thể trồi lên từ đất và giáng cả khối hồng ngọc xuống đội hình địch.",
  frost_dragon: "Rồng con băng mũm mĩm, sừng hươu pha lê, bờm tinh thể băng, đôi cánh dơi nhỏ màu đen và đuôi quạt pha lê. Dựng lồng kính băng che thân, bắn mảnh băng, cuốn sóng băng và gọi bão tuyết pha lê.",
  snowflight_dragon: "Rồng tuyết lông trắng muốt, sừng pha lê xanh, mỏ vàng và đôi cánh tiên ngọc lam, chóp đuôi là bông tuyết. Bay lượn bắn bông tuyết, quạt gió tuyết làm chậm và gọi bão tuyết đóng băng cả đội hình địch.",
  rosebud_dragon: "Rồng con xanh lá trườn mình như dây leo, vương miện nụ hồng tầm xuân, đôi cánh tiên hồng và chóp đuôi là nụ sen. Phóng gai hoa, quấn dây gai trói chân và gọi mưa cánh hoa hồi máu cho đồng đội.",
  immortal_bird: "Thần điểu bất tử rực rỡ sắc lửa, chiếc đuôi dài ba sợi lông mắt công. Phóng lông lửa, vỗ gió lửa và gọi mưa lông vũ thiêu cháy cả đội hình địch.",
  leaf_dragon: "Rồng cây xanh lá thân mảnh, đôi cánh lá thu và chóp đuôi chiếc lá. Phóng lá sắc, cuốn lốc lá và gọi mưa lá thần trói chân kẻ địch.",
  turtle_dragon: "Rồng rùa xanh ngọc cõng chiếc mai đá vàng. Trồi hai khẩu pháo từ mai, mắt rực sáng và há miệng nã năng lượng vào kẻ địch.",
  stone_ghost_dragon: "Rồng giáp đá lơ lửng với đôi cánh tinh thể đỏ. Từ cụm thấu kính trên đuôi bắn ra tia sáng đỏ xuyên thủng cả đội hình địch.",
  moon_dragon: "Rồng con xanh băng mang sừng trăng khuyết. Ngoạm bằng hàm răng ngọc bích, khạc vầng trăng sáng và gọi mưa mảnh trăng băng giá.",
  peacock: "Khổng Tước, chúa tể muôn loài chim. Xòe chiếc đuôi cầu vồng bắn tên lông vũ, nhảy vọt lên gọi cột sáng giáng xuống kẻ địch.",
  black_dragon: "Sát thủ bầu trời. Luôn chiến đấu trên không, bổ nhào xé toạc đối thủ và đoạt mệnh kẻ yếu.",
  bone_dragon: "Bộ xương rồng sống lại nhờ ngọn lửa xanh trong lồng ngực. Hứng đòn, hút máu và hồi sinh.",
  gold_dragon: "Rồng lông vũ giáp vàng đứng thẳng như chiến binh. Cào chéo bằng song trảo và phun luồng sáng mặt trời.",
  fire_phoenix: "Phượng hoàng lửa giáp vàng: đi bốn chân, sải đôi cánh lông vũ rực cháy bay lượn khắp đảo.",
  ice_phoenix: "Song sinh băng giá của Phượng Hoàng Lửa: lông vũ bạc lấp lánh như sương, bay lượn trong gió lạnh.",
  fire_dragon: "Rồng con lửa đỏ nghịch ngợm. Cắn bằng hàm răng rực lửa, khạc cầu lửa và gọi mưa lông vũ lửa thiêu đốt cả đội hình địch.",
  earth_dragon: "Rồng đất giáp đá như khủng long nhỏ, không biết bay nhưng lì đòn. Dậm chân gây địa chấn và gọi mưa đá làm choáng kẻ địch.",
  celestial_dragon: "Song sinh ánh sáng của Hắc Long: cùng thân hình, cùng lối đánh trên không, nhưng mang thánh quang hồi phục cả đội.",
  silver_dragon: "Song sinh ánh trăng của Rồng Vàng. Cùng chiêu thức nhưng mang sức mạnh ánh bạc, hồi phục dưới trăng.",
};
const ELEMENT_CLASS: Record<string, string> = { Băng: styles.ice, Ám: styles.dark, Quang: styles.light, Thủy: styles.water };

const ISLAND_BLURB: Record<string, string> = {
  meadow: "Đồng cỏ xanh với suối và thác nước — quê nhà của Hắc Long.",
  jungle: "Rừng nhiệt đới, thác đổ và đền cổ phủ rêu — nơi Tuấn Long ngự trị.",
  desert: "Cát vàng, ốc đảo và tàn tích cổ đại — lãnh địa của Rồng Xương.",
  whale: "Lưng cá voi khổng lồ giữa biển mây — quê nhà của Rồng Rùa.",
};

const BUILDINGS: { type: BuildingType; blurb: string }[] = [
  { type: "gold_mine", blurb: "Khai thác vàng để mua vật phẩm và nâng cấp công trình." },
  { type: "training_ground", blurb: "Huấn luyện rồng, tích kinh nghiệm để lên cấp." },
  { type: "stone_quarry", blurb: "Đào đá thăng cấp để nâng sao cho rồng." },
];

const FEATURES = [
  { icon: "/ui/battle.png", title: "Chiến đấu theo lượt", text: "Mỗi rồng có nội tại, đòn đánh, kỹ năng và tuyệt kỹ riêng." },
  { icon: "/ui/map.png", title: "Quần đảo nổi", text: "Mỗi đảo một cảnh sắc, một chủ nhân và công trình riêng." },
  { icon: "/ui/potion.png", title: "Tẩy tủy & thăng cấp", text: "Quay lại tư chất, nâng cấp sao để rồng mạnh hơn." },
  { icon: "/ui/cards.png", title: "Từ điển rồng", text: "Sưu tầm đủ hệ: Băng, Ám, Quang và các rồng nguyên tố." },
];

export default function HomePage() {
  return (
    <div className={styles.page}>
      <TopBar active="/" />

      {/* Hero */}
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <img className={styles.heroLogo} src="/ui/logo.png" alt="Dragon Island" />
          <p className={styles.tagline}>Nuôi rồng trên những hòn đảo nổi giữa biển mây — thu hoạch, huấn luyện và chiến đấu.</p>
          <div className={styles.heroActions}>
            <Link href="/play" className={styles.playBtn}>Chơi ngay</Link>
            <a href="#rong" className={styles.ghostBtn}>Khám phá rồng</a>
          </div>
        </div>
      </section>

      <main className="page-container">
        {/* Dragons */}
        <section id="rong" className={styles.section}>
          <h2 className={styles.title}>Rồng huyền thoại</h2>
          <p className={styles.subtitle}>Mỗi rồng một hệ, một lối đánh riêng.</p>
          <div className={styles.dragons}>
            {SPECIES.map(id => {
              const info = SPECIES_INFO[id];
              return (
                <article key={id} className={`${styles.dragonCard} ${ELEMENT_CLASS[info.element] ?? ""}`}>
                  <div className={styles.dragonArt}><img src={portraitUrl(id)} alt={info.name} /></div>
                  <div className={styles.dragonBody}>
                    <h3>{info.name}</h3>
                    <div className={styles.tags}>
                      <span>{info.element}</span><span className={styles.rarity}>{info.rarity}</span>
                    </div>
                    <p>{DRAGON_BLURB[id]}</p>
                    <ul className={styles.skillList}>
                      {SKILLS[id]?.map(s => (
                        <li key={s.type} title={s.desc}>
                          <img src={skillIconUrl(id, s.type)} alt="" />
                          <span>{s.name}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        {/* Islands */}
        <section id="dao" className={styles.section}>
          <h2 className={styles.title}>Quần đảo nổi</h2>
          <p className={styles.subtitle}>Kéo ngang trong game để ghé thăm từng đảo.</p>
          <div className={styles.islands}>
            {ISLANDS.map(isl => (
              <article key={isl.id} className={styles.islandCard}>
                <img src={`/islands/${isl.id}.png`} alt={isl.name} />
                <h3>{isl.name}</h3>
                <p>{ISLAND_BLURB[isl.id]}</p>
                <span className={styles.owner}>
                  <img src={portraitUrl(isl.dragon)} alt="" /> {SPECIES_INFO[isl.dragon].name}
                </span>
              </article>
            ))}
          </div>
        </section>

        {/* Buildings */}
        <section className={styles.section}>
          <h2 className={styles.title}>Công trình sản xuất</h2>
          <p className={styles.subtitle}>Nâng cấp 3 cấp — cấp càng cao, sản lượng càng lớn.</p>
          <div className={styles.buildings}>
            {BUILDINGS.map(b => (
              <article key={b.type} className={styles.buildingCard}>
                <div className={styles.buildingLevels}>
                  {[1, 2, 3].map(l => <img key={l} src={`/buildings/${b.type}_${l}.png`} alt={`${BUILDING_NAME[b.type]} cấp ${l}`} />)}
                </div>
                <h3>
                  <img src={`/ui/res_${PRODUCES[b.type]}.png`} alt="" />
                  {BUILDING_NAME[b.type]}
                </h3>
                <p>{b.blurb} <em>Sản xuất: {RESOURCE_NAME[PRODUCES[b.type]]}.</em></p>
              </article>
            ))}
          </div>
        </section>

        {/* Features */}
        <section className={styles.section}>
          <div className={styles.features}>
            {FEATURES.map(f => (
              <div key={f.title} className={styles.feature}>
                <img src={f.icon} alt="" />
                <h3>{f.title}</h3>
                <p>{f.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Call to action */}
        <section className={styles.cta}>
          <img src="/ui/logo.png" alt="" />
          <div>
            <h2>Đảo của bạn đang chờ</h2>
            <p>Chơi ngay trên trình duyệt, không cần cài đặt.</p>
          </div>
          <Link href="/play" className={styles.playBtn}>Vào đảo</Link>
        </section>
      </main>

      <Footer />
    </div>
  );
}
