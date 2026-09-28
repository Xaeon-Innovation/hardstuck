export type BoosterLiveOfferPayload = {
  type: "offer.new";
  offer: {
    id: string;
    expiresAt: string;
  };
  order: {
    id: string;
    game: string;
    serviceType: string;
    startRankKey: string;
    endRankKey: string;
    server: string;
    amountUsdCents: number;
  };
};

export const BOOSTER_OFFER_EVENT = "hardstuck:booster-offer";

export function dispatchBoosterOffer(payload: BoosterLiveOfferPayload) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(BOOSTER_OFFER_EVENT, { detail: payload }),
  );
}
