/* eslint-disable @next/next/no-img-element -- game art from /public, sized by CSS */
import Link from "next/link";
import { Footer, TopBar } from "@/components";
import { BUILDING_NAME, ISLANDS, PRODUCES, RESOURCE_NAME, type BuildingType } from "@/game/constants";
import { SKILLS, skillIconUrl } from "@/game/skills";
import { SPECIES, SPECIES_INFO, portraitUrl, type SpeciesId } from "@/game/species";
import styles from "./home.module.css";

const DRAGON_BLURB: Record<SpeciesId, string> = {
  ki_lan: "Linh thú điềm lành mình đỏ giáp vàng. Há miệng khạc ra đầu rồng vàng xuyên thủng cả đội hình địch.",
  hai_long: "Long vương của biển cả với bờm lửa và chóp đuôi lông công. Thủ lĩnh bộ Tứ Hải Long Vương.",
  hac_long: "Sát thủ bầu trời. Luôn chiến đấu trên không, bổ nhào xé toạc đối thủ và đoạt mệnh kẻ yếu.",
  rong_xuong: "Bộ xương rồng sống lại nhờ ngọn lửa xanh trong lồng ngực. Hứng đòn, hút máu và hồi sinh.",
  tuan_long: "Linh thú sừng băng bảo hộ cả đội: dựng lá chắn, giải hiệu ứng xấu và hồi sinh đồng đội.",
};
const ELEMENT_CLASS: Record<string, string> = { Băng: styles.ice, Ám: styles.dark, Quang: styles.light, Thủy: styles.water };

const ISLAND_BLURB: Record<string, string> = {
  meadow: "Đồng cỏ xanh với suối và thác nước — quê nhà của Hắc Long.",
  jungle: "Rừng nhiệt đới, thác đổ và đền cổ phủ rêu — nơi Tuấn Long ngự trị.",
  desert: "Cát vàng, ốc đảo và tàn tích cổ đại — lãnh địa của Rồng Xương.",
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
      <TopBar />

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
                      {SKILLS[id].map(s => (
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
