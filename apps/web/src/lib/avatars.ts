export type AvatarGame = "lol" | "valorant";

export type AvatarOption = {
  id: string;
  game: AvatarGame;
  name: string;
  /** Public image URL stored on user.image */
  src: string;
};

const DDRAGON = "https://ddragon.leagueoflegends.com/cdn/14.19.1/img/champion";

/** Curated LoL champion icons (Data Dragon). */
const LOL: { id: string; name: string }[] = [
  { id: "Ahri", name: "Ahri" },
  { id: "Akali", name: "Akali" },
  { id: "Ezreal", name: "Ezreal" },
  { id: "Jinx", name: "Jinx" },
  { id: "KaiSa", name: "Kai'Sa" },
  { id: "Katarina", name: "Katarina" },
  { id: "LeeSin", name: "Lee Sin" },
  { id: "Lux", name: "Lux" },
  { id: "MissFortune", name: "Miss Fortune" },
  { id: "Samira", name: "Samira" },
  { id: "Sett", name: "Sett" },
  { id: "Thresh", name: "Thresh" },
  { id: "Viego", name: "Viego" },
  { id: "Yasuo", name: "Yasuo" },
  { id: "Yone", name: "Yone" },
  { id: "Zed", name: "Zed" },
];

/** Valorant agent display icons (valorant-api.com). */
const VALORANT: { id: string; name: string; uuid: string }[] = [
  { id: "jett", name: "Jett", uuid: "add6443a-41bd-e414-f6ad-e58d267f4e95" },
  { id: "phoenix", name: "Phoenix", uuid: "eb93336a-449b-9c1b-0a54-a891f7921d69" },
  { id: "sage", name: "Sage", uuid: "569fdd95-4d10-43ab-ca70-79becc718b46" },
  { id: "sova", name: "Sova", uuid: "320b2a48-4d9b-a075-30f1-1f93a9b638fa" },
  { id: "viper", name: "Viper", uuid: "707eab51-4836-f488-046a-cda6bf494859" },
  { id: "cypher", name: "Cypher", uuid: "117ed9e3-49f3-6512-3ccf-0cada7e3823b" },
  { id: "reyna", name: "Reyna", uuid: "a3bfb853-43b2-7238-a4f1-ad90e9e46bcc" },
  { id: "killjoy", name: "Killjoy", uuid: "1e58de9c-4950-5125-93e9-a0aee9f98746" },
  { id: "breach", name: "Breach", uuid: "5f8d3a7f-467b-97f3-062c-13acf203c006" },
  { id: "omen", name: "Omen", uuid: "8e253930-4c05-31dd-1b6c-968525494517" },
  { id: "raze", name: "Raze", uuid: "f94c3b30-42be-e959-889c-5aa313dba261" },
  { id: "skye", name: "Skye", uuid: "6f2a04ca-43e0-be17-7f36-b3908627744d" },
  { id: "yoru", name: "Yoru", uuid: "7f94d92c-4234-0a36-9646-3a87eb8b5c89" },
  { id: "astra", name: "Astra", uuid: "41fb69c1-4189-7b37-f117-bcaf1e96f1bf" },
  { id: "kayo", name: "KAY/O", uuid: "601dbbe7-43ce-be57-2a40-4abd24953621" },
  { id: "chamber", name: "Chamber", uuid: "22697a3d-45bf-8dd7-4fec-84a9e28c69d7" },
  { id: "neon", name: "Neon", uuid: "bb2a4828-46eb-8cd1-e765-15848195d751" },
  { id: "fade", name: "Fade", uuid: "dade69b4-4f5a-8528-247b-219e5a1facd6" },
  { id: "harbor", name: "Harbor", uuid: "95b78ed7-4637-86d9-7e41-71ba8c293152" },
  { id: "gekko", name: "Gekko", uuid: "e370fa57-4757-3604-3648-499e1f642d3f" },
  { id: "iso", name: "Iso", uuid: "0e38b510-41a8-5780-5e8f-568b2a4f2d6c" },
  { id: "clove", name: "Clove", uuid: "1dbf2edd-4729-0984-3115-daa5eed44993" },
  { id: "vyse", name: "Vyse", uuid: "efba5359-4016-a1e5-7626-b1ae76895940" },
  { id: "brimstone", name: "Brimstone", uuid: "9f0d8ba9-4140-b941-57d3-a7ad57c6b417" },
  { id: "deadlock", name: "Deadlock", uuid: "cc8b64c8-4b25-4ff9-6e7f-37b4da43d235" },
];

export const AVATAR_OPTIONS: AvatarOption[] = [
  ...LOL.map((c) => ({
    id: `lol:${c.id}`,
    game: "lol" as const,
    name: c.name,
    src: `${DDRAGON}/${c.id}.png`,
  })),
  ...VALORANT.map((a) => ({
    id: `valorant:${a.id}`,
    game: "valorant" as const,
    name: a.name,
    src: `https://media.valorant-api.com/agents/${a.uuid}/displayicon.png`,
  })),
];

export function isAllowedAvatarSrc(src: string): boolean {
  return AVATAR_OPTIONS.some((a) => a.src === src);
}

export function avatarBySrc(
  src: string | null | undefined,
): AvatarOption | undefined {
  if (!src) return undefined;
  return AVATAR_OPTIONS.find((a) => a.src === src);
}
