import ReactGA from "react-ga4";

export function initGA() {
  ReactGA.initialize("G-PL3KVD6MLM");
}

export function trackPageView(path) {
  ReactGA.send({ hitType: "pageview", page: path });
}

export function trackEvent(category, action, label) {
  ReactGA.event({ category, action, label });
}
