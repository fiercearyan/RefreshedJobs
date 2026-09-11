// ---------------------------------------------------------------------------
// High-Pay Radar company dataset (snapshot).
//
// Source: https://github.com/fiercearyan/HighPayRadar  ->  lib/companies.js
// 195 curated companies paying ~₹25L+ for a 3-5 yr backend engineer in India.
//
// This file is DATA ONLY and is used exclusively by the High Pay board
// (/highpay). Nothing in the regular OpenRoles board reads it.
//
// To re-sync: copy the COMPANIES array out of HighPayRadar's lib/companies.js
// and regenerate this list (fields: n=name, cat=sector, p=pay band,
// t=tier, u=careers URL, l=locations).
// ---------------------------------------------------------------------------

export type HighPayTier = 1 | 2 | 3;
export type HighPayCat = "bt" | "saas" | "inp" | "bfsi" | "hft" | "semi" | "gcc";

export interface HighPayCompany {
  n: string;   // company name (as listed by High Pay Radar)
  cat: HighPayCat;
  p: string;   // pay band label, e.g. "₹45–75L"
  t: HighPayTier; // 1: 25-35L, 2: 35-50L, 3: 50L+
  u: string;   // careers page
  l: string;   // typical locations
}

export const HIGH_PAY_COMPANIES: HighPayCompany[] = [
  { n: "Amazon", cat: "bt", p: "₹45–75L", t: 3, u: "https://www.amazon.jobs/en/", l: "Blr · Hyd · Chn" },
  { n: "Apple", cat: "bt", p: "₹45–80L", t: 3, u: "https://jobs.apple.com/en-in/search?location=india-INDC", l: "Hyd · Blr" },
  { n: "Atlassian", cat: "bt", p: "₹45–75L", t: 3, u: "https://www.atlassian.com/company/careers/all-jobs", l: "Blr · remote-first" },
  { n: "GitHub", cat: "bt", p: "₹40–65L", t: 3, u: "https://github.careers/", l: "Hyd · remote" },
  { n: "Google", cat: "bt", p: "₹50–90L", t: 3, u: "https://www.google.com/about/careers/applications/", l: "Blr · Hyd · Pune · GGN" },
  { n: "Intuit", cat: "bt", p: "₹40–65L", t: 3, u: "https://jobs.intuit.com/", l: "Bengaluru" },
  { n: "LinkedIn", cat: "bt", p: "₹40–70L", t: 3, u: "https://careers.linkedin.com/", l: "Bengaluru" },
  { n: "Meta", cat: "bt", p: "₹60L+ (US-level)", t: 3, u: "https://www.metacareers.com/jobs", l: "Limited India eng" },
  { n: "Microsoft", cat: "bt", p: "₹40–70L", t: 3, u: "https://careers.microsoft.com/", l: "Hyd · Blr · Noida" },
  { n: "Uber", cat: "bt", p: "₹45–80L", t: 3, u: "https://www.uber.com/us/en/careers/list/", l: "Blr · Hyd" },
  { n: "Adobe", cat: "bt", p: "₹35–60L", t: 2, u: "https://careers.adobe.com/us/en", l: "Noida · Blr" },
  { n: "Booking Holdings", cat: "bt", p: "₹35–55L", t: 2, u: "https://careers.booking.com/", l: "Bengaluru" },
  { n: "Cisco", cat: "bt", p: "₹30–55L", t: 2, u: "https://jobs.cisco.com/", l: "Bengaluru" },
  { n: "Expedia Group", cat: "bt", p: "₹35–55L", t: 2, u: "https://careers.expediagroup.com/jobs/", l: "GGN · Blr" },
  { n: "Oracle", cat: "bt", p: "₹30–50L", t: 2, u: "https://careers.oracle.com/", l: "Blr · Hyd" },
  { n: "PayPal", cat: "bt", p: "₹35–55L", t: 2, u: "https://careers.pypl.com/home/", l: "Blr · Chn · Hyd" },
  { n: "Salesforce", cat: "bt", p: "₹35–60L", t: 2, u: "https://careers.salesforce.com/en/jobs/", l: "Hyd · Blr" },
  { n: "ServiceNow", cat: "bt", p: "₹35–60L", t: 2, u: "https://careers.servicenow.com/", l: "Hyderabad" },
  { n: "VMware by Broadcom", cat: "bt", p: "₹35–60L", t: 2, u: "https://www.broadcom.com/company/careers", l: "Bengaluru" },
  { n: "Workday", cat: "bt", p: "₹30–50L", t: 2, u: "https://www.workday.com/en-us/company/careers.html", l: "Pune · Chn" },
  { n: "Zoom", cat: "bt", p: "₹30–50L", t: 2, u: "https://careers.zoom.us/", l: "Bengaluru" },
  { n: "eBay", cat: "bt", p: "₹35–55L", t: 2, u: "https://jobs.ebayinc.com/", l: "Bengaluru" },
  { n: "SAP Labs", cat: "bt", p: "₹28–45L", t: 1, u: "https://jobs.sap.com/", l: "Bengaluru" },
  { n: "Arista Networks", cat: "saas", p: "₹45–80L", t: 3, u: "https://www.arista.com/en/careers", l: "Pune · Blr" },
  { n: "Cloudflare", cat: "saas", p: "₹40–65L", t: 3, u: "https://www.cloudflare.com/careers/", l: "Bengaluru" },
  { n: "Coinbase", cat: "saas", p: "₹50–80L", t: 3, u: "https://www.coinbase.com/careers", l: "Remote India · Hyd" },
  { n: "Confluent", cat: "saas", p: "₹40–65L", t: 3, u: "https://careers.confluent.io/", l: "Blr · remote" },
  { n: "Databricks", cat: "saas", p: "₹50–85L", t: 3, u: "https://www.databricks.com/company/careers", l: "Bengaluru" },
  { n: "DoorDash", cat: "saas", p: "₹45–75L", t: 3, u: "https://careers.doordash.com/", l: "Pune" },
  { n: "Gemini", cat: "saas", p: "₹40–70L", t: 3, u: "https://www.gemini.com/careers", l: "Gurgaon" },
  { n: "Glean", cat: "saas", p: "₹45–75L", t: 3, u: "https://www.glean.com/careers", l: "Bengaluru" },
  { n: "Grafana Labs", cat: "saas", p: "₹40–70L", t: 3, u: "https://grafana.com/about/careers/", l: "Remote India" },
  { n: "Media.net", cat: "saas", p: "₹40–70L", t: 3, u: "https://www.media.net/careers/", l: "Mum · Blr" },
  { n: "Postman", cat: "saas", p: "₹40–65L", t: 3, u: "https://www.postman.com/company/careers/", l: "Bengaluru" },
  { n: "Rippling", cat: "saas", p: "₹45–75L", t: 3, u: "https://www.rippling.com/careers", l: "Bengaluru" },
  { n: "Rubrik", cat: "saas", p: "₹40–65L", t: 3, u: "https://www.rubrik.com/company/careers", l: "Bengaluru" },
  { n: "Snowflake", cat: "saas", p: "₹40–70L", t: 3, u: "https://careers.snowflake.com/", l: "Pune" },
  { n: "Stripe", cat: "saas", p: "₹45–80L", t: 3, u: "https://stripe.com/jobs/search", l: "Blr · remote" },
  { n: "Akamai", cat: "saas", p: "₹30–50L", t: 2, u: "https://www.akamai.com/careers", l: "Bengaluru" },
  { n: "Amagi", cat: "saas", p: "₹30–50L", t: 2, u: "https://www.amagi.com/careers", l: "Bengaluru" },
  { n: "Autodesk", cat: "saas", p: "₹30–50L", t: 2, u: "https://www.autodesk.com/careers/", l: "Pune · Blr" },
  { n: "Automation Anywhere", cat: "saas", p: "₹30–50L", t: 2, u: "https://www.automationanywhere.com/company/careers", l: "Bengaluru" },
  { n: "BrowserStack", cat: "saas", p: "₹30–50L", t: 2, u: "https://www.browserstack.com/careers", l: "Mum · remote" },
  { n: "Cloudera", cat: "saas", p: "₹30–50L", t: 2, u: "https://www.cloudera.com/careers.html", l: "Bengaluru" },
  { n: "Cohesity", cat: "saas", p: "₹35–55L", t: 2, u: "https://www.cohesity.com/company/careers/", l: "Pune · Blr" },
  { n: "CrowdStrike", cat: "saas", p: "₹35–60L", t: 2, u: "https://www.crowdstrike.com/careers/", l: "Remote India · Pune" },
  { n: "Druva", cat: "saas", p: "₹30–50L", t: 2, u: "https://www.druva.com/company/careers", l: "Pune" },
  { n: "Elastic", cat: "saas", p: "₹35–60L", t: 2, u: "https://www.elastic.co/careers/", l: "Remote India" },
  { n: "F5", cat: "saas", p: "₹30–50L", t: 2, u: "https://www.f5.com/company/careers", l: "Hyderabad" },
  { n: "GitLab", cat: "saas", p: "₹35–60L", t: 2, u: "https://about.gitlab.com/jobs/", l: "Remote India" },
  { n: "Harness", cat: "saas", p: "₹35–60L", t: 2, u: "https://www.harness.io/company/careers", l: "Bengaluru" },
  { n: "Hasura", cat: "saas", p: "₹35–60L", t: 2, u: "https://hasura.io/careers/", l: "Blr · remote" },
  { n: "Juniper (HPE)", cat: "saas", p: "₹30–50L", t: 2, u: "https://careers.juniper.net/", l: "Bengaluru" },
  { n: "MongoDB", cat: "saas", p: "₹35–60L", t: 2, u: "https://www.mongodb.com/company/careers", l: "GGN · Blr" },
  { n: "NetApp", cat: "saas", p: "₹30–50L", t: 2, u: "https://careers.netapp.com/", l: "Bengaluru" },
  { n: "Netskope", cat: "saas", p: "₹30–55L", t: 2, u: "https://www.netskope.com/company/careers", l: "Bengaluru" },
  { n: "New Relic", cat: "saas", p: "₹30–50L", t: 2, u: "https://newrelic.com/about/careers", l: "Hyd · Blr" },
  { n: "Nutanix", cat: "saas", p: "₹35–60L", t: 2, u: "https://www.nutanix.com/company/careers", l: "Bengaluru" },
  { n: "Okta", cat: "saas", p: "₹35–55L", t: 2, u: "https://www.okta.com/company/careers/", l: "Bengaluru" },
  { n: "Palo Alto Networks", cat: "saas", p: "₹35–60L", t: 2, u: "https://jobs.paloaltonetworks.com/", l: "Bengaluru" },
  { n: "Pure Storage", cat: "saas", p: "₹35–60L", t: 2, u: "https://www.purestorage.com/company/careers.html", l: "Bengaluru" },
  { n: "Splunk (Cisco)", cat: "saas", p: "₹35–55L", t: 2, u: "https://www.splunk.com/en_us/careers.html", l: "Hyderabad" },
  { n: "Sprinklr", cat: "saas", p: "₹30–55L", t: 2, u: "https://www.sprinklr.com/careers/", l: "GGN · Blr" },
  { n: "Sumo Logic", cat: "saas", p: "₹30–50L", t: 2, u: "https://www.sumologic.com/company/careers/", l: "Noida · remote" },
  { n: "Tekion", cat: "saas", p: "₹35–60L", t: 2, u: "https://tekion.com/careers", l: "Blr · Chn" },
  { n: "ThoughtSpot", cat: "saas", p: "₹35–60L", t: 2, u: "https://www.thoughtspot.com/careers", l: "Bengaluru" },
  { n: "Twilio", cat: "saas", p: "₹35–55L", t: 2, u: "https://www.twilio.com/en-us/company/jobs", l: "Remote India · Blr" },
  { n: "UiPath", cat: "saas", p: "₹30–50L", t: 2, u: "https://www.uipath.com/company/careers", l: "Bengaluru" },
  { n: "Wise", cat: "saas", p: "₹35–60L", t: 2, u: "https://wise.jobs/", l: "Hyderabad" },
  { n: "Zscaler", cat: "saas", p: "₹30–55L", t: 2, u: "https://www.zscaler.com/careers", l: "Blr · Chd · Pune" },
  { n: "Chargebee", cat: "saas", p: "₹28–45L", t: 1, u: "https://www.chargebee.com/careers/", l: "Chennai · remote" },
  { n: "Freshworks", cat: "saas", p: "₹28–45L", t: 1, u: "https://careers.freshworks.com/", l: "Chn · Blr" },
  { n: "Informatica", cat: "saas", p: "₹28–45L", t: 1, u: "https://www.informatica.com/in/company/careers.html", l: "Bengaluru" },
  { n: "Innovaccer", cat: "saas", p: "₹28–45L", t: 1, u: "https://innovaccer.com/careers", l: "Noida · Blr" },
  { n: "Whatfix", cat: "saas", p: "₹28–45L", t: 1, u: "https://whatfix.com/careers/", l: "Bengaluru" },
  { n: "CRED", cat: "inp", p: "₹40–70L", t: 3, u: "https://careers.cred.club/", l: "Bengaluru" },
  { n: "Dream Sports (Dream11)", cat: "inp", p: "₹40–65L", t: 3, u: "https://www.dreamsports.group/careers", l: "Mumbai" },
  { n: "PhonePe", cat: "inp", p: "₹40–70L", t: 3, u: "https://www.phonepe.com/careers/", l: "Bengaluru" },
  { n: "Sarvam AI", cat: "inp", p: "₹40–70L", t: 3, u: "https://www.sarvam.ai/careers", l: "Bengaluru" },
  { n: "Acko", cat: "inp", p: "₹30–50L", t: 2, u: "https://www.acko.com/careers/", l: "Bengaluru" },
  { n: "BharatPe", cat: "inp", p: "₹30–50L", t: 2, u: "https://bharatpe.com/careers", l: "Delhi NCR" },
  { n: "CoinDCX", cat: "inp", p: "₹35–60L", t: 2, u: "https://careers.coindcx.com/", l: "Remote India" },
  { n: "CoinSwitch", cat: "inp", p: "₹35–60L", t: 2, u: "https://coinswitch.co/careers", l: "Bengaluru" },
  { n: "Eternal (Zomato · Blinkit)", cat: "inp", p: "₹35–60L", t: 2, u: "https://www.eternal.com/careers", l: "GGN · remote" },
  { n: "Flipkart", cat: "inp", p: "₹35–60L", t: 2, u: "https://www.flipkartcareers.com/", l: "Bengaluru" },
  { n: "Games24x7", cat: "inp", p: "₹35–55L", t: 2, u: "https://www.games24x7.com/careers", l: "Mum · Blr" },
  { n: "Groww", cat: "inp", p: "₹35–60L", t: 2, u: "https://groww.in/careers", l: "Bengaluru" },
  { n: "InMobi / Glance", cat: "inp", p: "₹35–60L", t: 2, u: "https://www.inmobi.com/company/careers", l: "Bengaluru" },
  { n: "JioHotstar", cat: "inp", p: "₹35–60L", t: 2, u: "https://careers.hotstar.com/", l: "Bengaluru" },
  { n: "Jupiter", cat: "inp", p: "₹30–50L", t: 2, u: "https://jupiter.money/careers/", l: "Bengaluru" },
  { n: "Juspay", cat: "inp", p: "₹30–55L", t: 2, u: "https://juspay.in/careers", l: "Bengaluru" },
  { n: "Lenskart", cat: "inp", p: "₹30–50L", t: 2, u: "https://www.lenskart.com/careers", l: "GGN · Blr" },
  { n: "MPL", cat: "inp", p: "₹30–50L", t: 2, u: "https://www.mpl.live/careers", l: "Bengaluru" },
  { n: "Meesho", cat: "inp", p: "₹35–60L", t: 2, u: "https://www.meesho.io/jobs", l: "Bengaluru" },
  { n: "Myntra", cat: "inp", p: "₹30–50L", t: 2, u: "https://careers.myntra.com/", l: "Bengaluru" },
  { n: "Navi", cat: "inp", p: "₹35–60L", t: 2, u: "https://navi.com/careers", l: "Bengaluru" },
  { n: "PayU", cat: "inp", p: "₹30–50L", t: 2, u: "https://payu.in/careers/", l: "GGN · Blr · Mum" },
  { n: "Pine Labs", cat: "inp", p: "₹30–50L", t: 2, u: "https://www.pinelabs.com/careers", l: "Noida · Blr" },
  { n: "Porter", cat: "inp", p: "₹30–50L", t: 2, u: "https://porter.in/careers", l: "Bengaluru" },
  { n: "Rapido", cat: "inp", p: "₹30–55L", t: 2, u: "https://rapido.bike/Careers", l: "Bengaluru" },
  { n: "Razorpay", cat: "inp", p: "₹35–60L", t: 2, u: "https://razorpay.com/jobs/", l: "Bengaluru" },
  { n: "ShareChat", cat: "inp", p: "₹35–60L", t: 2, u: "https://sharechat.com/careers", l: "Bengaluru" },
  { n: "Slice", cat: "inp", p: "₹30–50L", t: 2, u: "https://www.sliceit.com/careers", l: "Bengaluru" },
  { n: "Swiggy", cat: "inp", p: "₹35–60L", t: 2, u: "https://careers.swiggy.com/", l: "Bengaluru" },
  { n: "Upstox", cat: "inp", p: "₹30–50L", t: 2, u: "https://upstox.com/careers/", l: "Mumbai" },
  { n: "Urban Company", cat: "inp", p: "₹30–50L", t: 2, u: "https://www.urbancompany.com/careers", l: "Gurgaon" },
  { n: "Zepto", cat: "inp", p: "₹35–60L", t: 2, u: "https://www.zepto.com/s/careers", l: "Blr · Mum" },
  { n: "Zerodha", cat: "inp", p: "₹30–60L", t: 2, u: "https://zerodha.com/careers/", l: "Bengaluru" },
  { n: "Zeta", cat: "inp", p: "₹35–60L", t: 2, u: "https://www.zeta.tech/in/careers", l: "Blr · Hyd" },
  { n: "Airtel X Labs", cat: "inp", p: "₹28–48L", t: 1, u: "https://careers.airtel.com/", l: "GGN · Blr" },
  { n: "Angel One", cat: "inp", p: "₹28–45L", t: 1, u: "https://www.angelone.in/careers", l: "Mum · Blr" },
  { n: "Cashfree", cat: "inp", p: "₹28–45L", t: 1, u: "https://www.cashfree.com/careers/", l: "Bengaluru" },
  { n: "Cleartrip (Flipkart)", cat: "inp", p: "₹28–45L", t: 1, u: "https://www.cleartrip.com/careers/", l: "Bengaluru" },
  { n: "MakeMyTrip", cat: "inp", p: "₹28–45L", t: 1, u: "https://careers.makemytrip.com/", l: "GGN · Blr" },
  { n: "Paytm", cat: "inp", p: "₹28–45L", t: 1, u: "https://paytm.com/careers/", l: "Noida · Blr" },
  { n: "Arcesium", cat: "bfsi", p: "₹40–65L", t: 3, u: "https://www.arcesium.com/careers", l: "Hyd · Blr" },
  { n: "American Express", cat: "bfsi", p: "₹30–55L", t: 2, u: "https://www.americanexpress.com/en-us/careers/", l: "GGN · Blr" },
  { n: "Barclays", cat: "bfsi", p: "₹30–50L", t: 2, u: "https://home.barclays/careers/", l: "Pune · Chn" },
  { n: "BlackRock", cat: "bfsi", p: "₹30–55L", t: 2, u: "https://careers.blackrock.com/", l: "GGN · Mum · Blr" },
  { n: "Deutsche Bank", cat: "bfsi", p: "₹30–50L", t: 2, u: "https://careers.db.com/", l: "Pune · Blr" },
  { n: "Goldman Sachs", cat: "bfsi", p: "₹35–60L", t: 2, u: "https://www.goldmansachs.com/careers/", l: "Blr · Hyd" },
  { n: "ICE (NYSE)", cat: "bfsi", p: "₹30–50L", t: 2, u: "https://careers.ice.com/", l: "Hyderabad" },
  { n: "JPMorgan Chase", cat: "bfsi", p: "₹30–50L", t: 2, u: "https://careers.jpmorgan.com/global/en/home", l: "Hyd · Blr · Mum" },
  { n: "Macquarie", cat: "bfsi", p: "₹35–60L", t: 2, u: "https://www.macquarie.com/careers", l: "GGN · Hyd" },
  { n: "Mastercard", cat: "bfsi", p: "₹35–55L", t: 2, u: "https://careers.mastercard.com/", l: "Pune · GGN" },
  { n: "Morgan Stanley", cat: "bfsi", p: "₹30–55L", t: 2, u: "https://www.morganstanley.com/careers", l: "Mum · Blr" },
  { n: "Nasdaq", cat: "bfsi", p: "₹30–50L", t: 2, u: "https://www.nasdaq.com/about/careers", l: "Bengaluru" },
  { n: "Visa", cat: "bfsi", p: "₹35–55L", t: 2, u: "https://corporate.visa.com/en/careers.html", l: "Bengaluru" },
  { n: "BNY", cat: "bfsi", p: "₹28–45L", t: 1, u: "https://www.bny.com/corporate/global/en/careers.html", l: "Pune · Chn" },
  { n: "Bank of America", cat: "bfsi", p: "₹28–45L", t: 1, u: "https://careers.bankofamerica.com/", l: "Hyd · GGN · Mum" },
  { n: "Citi", cat: "bfsi", p: "₹28–45L", t: 1, u: "https://jobs.citi.com/", l: "Pune · Chn · Mum" },
  { n: "Fidelity", cat: "bfsi", p: "₹28–48L", t: 1, u: "https://jobs.fidelity.com/", l: "Blr · Chn" },
  { n: "HSBC Technology", cat: "bfsi", p: "₹28–45L", t: 1, u: "https://www.hsbc.com/careers", l: "Pune · Hyd" },
  { n: "UBS", cat: "bfsi", p: "₹28–48L", t: 1, u: "https://www.ubs.com/global/en/careers.html", l: "Pune · Mum · Hyd" },
  { n: "Wells Fargo", cat: "bfsi", p: "₹28–48L", t: 1, u: "https://www.wellsfargojobs.com/en/", l: "Hyd · Blr · Chn" },
  { n: "APT Portfolio", cat: "hft", p: "₹40–80L", t: 3, u: "https://www.aptportfolio.com/", l: "Delhi NCR" },
  { n: "AlphaGrep", cat: "hft", p: "₹50L–1Cr", t: 3, u: "https://www.alpha-grep.com/careers/", l: "Mum · Blr" },
  { n: "D. E. Shaw India", cat: "hft", p: "₹50L–1Cr+", t: 3, u: "https://www.deshawindia.com/careers", l: "Hyderabad" },
  { n: "Graviton Research", cat: "hft", p: "₹60L–2Cr", t: 3, u: "https://www.gravitontrading.com/careers.html", l: "Delhi NCR" },
  { n: "Millennium", cat: "hft", p: "₹60L+", t: 3, u: "https://www.mlp.com/careers/", l: "Bengaluru" },
  { n: "NK Securities Research", cat: "hft", p: "₹50L–1Cr", t: 3, u: "https://www.nksecurities.com/", l: "Mumbai" },
  { n: "Optiver", cat: "hft", p: "₹80L+", t: 3, u: "https://optiver.com/working-at-optiver/career-opportunities/", l: "Mumbai" },
  { n: "Quadeye", cat: "hft", p: "₹50L–1.5Cr", t: 3, u: "https://quadeye.com/", l: "Gurgaon" },
  { n: "Squarepoint Capital", cat: "hft", p: "₹45–90L", t: 3, u: "https://www.squarepoint-capital.com/careers", l: "Bengaluru" },
  { n: "Tower Research Capital", cat: "hft", p: "₹60L–1.5Cr", t: 3, u: "https://www.tower-research.com/open-positions/", l: "GGN · GIFT City" },
  { n: "WorldQuant", cat: "hft", p: "₹45–90L", t: 3, u: "https://www.worldquant.com/careers/", l: "Mumbai" },
  { n: "iRage", cat: "hft", p: "₹40–80L", t: 3, u: "https://irage.in/", l: "Mumbai" },
  { n: "NVIDIA", cat: "semi", p: "₹40–70L", t: 3, u: "https://www.nvidia.com/en-in/about-nvidia/careers/", l: "Blr · Pune · Hyd" },
  { n: "AMD", cat: "semi", p: "₹30–50L", t: 2, u: "https://careers.amd.com/", l: "Hyd · Blr" },
  { n: "Arm", cat: "semi", p: "₹35–55L", t: 2, u: "https://careers.arm.com/", l: "Bengaluru" },
  { n: "Intel", cat: "semi", p: "₹30–50L", t: 2, u: "https://jobs.intel.com/", l: "Bengaluru" },
  { n: "Marvell", cat: "semi", p: "₹30–50L", t: 2, u: "https://www.marvell.com/company/careers.html", l: "Pune · Blr" },
  { n: "Qualcomm", cat: "semi", p: "₹32–55L", t: 2, u: "https://careers.qualcomm.com/careers", l: "Hyd · Blr" },
  { n: "Texas Instruments", cat: "semi", p: "₹30–50L", t: 2, u: "https://careers.ti.com/", l: "Bengaluru" },
  { n: "Cadence", cat: "semi", p: "₹28–45L", t: 1, u: "https://www.cadence.com/en_US/home/company/careers.html", l: "Noida · Blr" },
  { n: "MediaTek", cat: "semi", p: "₹28–45L", t: 1, u: "https://careers.mediatek.com/", l: "Noida · Blr" },
  { n: "Micron", cat: "semi", p: "₹28–45L", t: 1, u: "https://careers.micron.com/", l: "Hyderabad" },
  { n: "Samsung R&D (SRI-B)", cat: "semi", p: "₹28–45L", t: 1, u: "https://research.samsung.com/careers", l: "Blr · Noida" },
  { n: "Synopsys", cat: "semi", p: "₹28–45L", t: 1, u: "https://www.synopsys.com/careers.html", l: "Bengaluru" },
  { n: "Walmart Global Tech", cat: "gcc", p: "₹40–65L", t: 3, u: "https://careers.walmart.com/", l: "Blr · Chn" },
  { n: "American Airlines Tech Hub", cat: "gcc", p: "₹30–50L", t: 2, u: "https://jobs.aa.com/", l: "Hyderabad" },
  { n: "Chevron ENGINE", cat: "gcc", p: "₹30–55L", t: 2, u: "https://careers.chevron.com/", l: "Bengaluru" },
  { n: "Delta Technology Hub", cat: "gcc", p: "₹30–50L", t: 2, u: "https://careers.delta.com/", l: "Bengaluru" },
  { n: "Evernorth (Cigna)", cat: "gcc", p: "₹30–50L", t: 2, u: "https://jobs.thecignagroup.com/", l: "Hyderabad" },
  { n: "GE Aerospace", cat: "gcc", p: "₹30–50L", t: 2, u: "https://careers.geaerospace.com/", l: "Bengaluru" },
  { n: "General Motors TCI", cat: "gcc", p: "₹30–50L", t: 2, u: "https://search-careers.gm.com/", l: "Bengaluru" },
  { n: "Lowe's India", cat: "gcc", p: "₹35–55L", t: 2, u: "https://talent.lowes.com/us/en/lowes-india", l: "Bengaluru" },
  { n: "Maersk Technology", cat: "gcc", p: "₹30–50L", t: 2, u: "https://www.maersk.com/careers", l: "Blr · Pune" },
  { n: "McDonald's Global Tech", cat: "gcc", p: "₹30–50L", t: 2, u: "https://careers.mcdonalds.com/", l: "Hyderabad" },
  { n: "Medtronic Engineering Center", cat: "gcc", p: "₹30–50L", t: 2, u: "https://jobs.medtronic.com/", l: "Hyderabad" },
  { n: "Mercedes-Benz R&D India", cat: "gcc", p: "₹30–50L", t: 2, u: "https://www.mbrdi.co.in/", l: "Bengaluru" },
  { n: "Target in India", cat: "gcc", p: "₹35–55L", t: 2, u: "https://india.target.com/", l: "Bengaluru" },
  { n: "Tesco Bengaluru", cat: "gcc", p: "₹30–50L", t: 2, u: "https://www.tescobengaluru.com/", l: "Bengaluru" },
  { n: "lululemon India Tech Hub", cat: "gcc", p: "₹30–50L", t: 2, u: "https://careers.lululemon.com/", l: "Bengaluru" },
  { n: "Airbus India", cat: "gcc", p: "₹28–45L", t: 1, u: "https://www.airbus.com/en/careers", l: "Bengaluru" },
  { n: "Boeing India", cat: "gcc", p: "₹28–45L", t: 1, u: "https://jobs.boeing.com/", l: "Bengaluru" },
  { n: "CVS Health", cat: "gcc", p: "₹28–45L", t: 1, u: "https://jobs.cvshealth.com/", l: "Hyderabad" },
  { n: "Carelon (Elevance)", cat: "gcc", p: "₹28–45L", t: 1, u: "https://careers.carelonglobal.in/", l: "Blr · Hyd" },
  { n: "Caterpillar", cat: "gcc", p: "₹28–45L", t: 1, u: "https://careers.caterpillar.com/", l: "Chn · Blr" },
  { n: "Collins Aerospace (RTX)", cat: "gcc", p: "₹28–45L", t: 1, u: "https://careers.rtx.com/", l: "Hyd · Blr" },
  { n: "FedEx ACC", cat: "gcc", p: "₹28–45L", t: 1, u: "https://careers.fedex.com/", l: "Hyd · Blr" },
  { n: "Ford Business Solutions", cat: "gcc", p: "₹28–45L", t: 1, u: "https://corporate.ford.com/careers.html", l: "Chennai" },
  { n: "Honeywell", cat: "gcc", p: "₹28–45L", t: 1, u: "https://careers.honeywell.com/", l: "Bengaluru" },
  { n: "John Deere", cat: "gcc", p: "₹28–45L", t: 1, u: "https://careers.deere.com/", l: "Pune" },
  { n: "Marriott Tech Center", cat: "gcc", p: "₹28–45L", t: 1, u: "https://careers.marriott.com/", l: "Hyderabad" },
  { n: "Optum (UnitedHealth)", cat: "gcc", p: "₹28–48L", t: 1, u: "https://careers.unitedhealthgroup.com/", l: "Hyd · GGN · Blr" },
  { n: "PepsiCo Digital Hub", cat: "gcc", p: "₹28–45L", t: 1, u: "https://www.pepsicojobs.com/", l: "Hyd · GGN" },
  { n: "Philips Innovation Campus", cat: "gcc", p: "₹28–45L", t: 1, u: "https://www.careers.philips.com/", l: "Bengaluru" },
  { n: "Rolls-Royce", cat: "gcc", p: "₹28–45L", t: 1, u: "https://careers.rolls-royce.com/", l: "Bengaluru" },
  { n: "Sainsbury's Tech", cat: "gcc", p: "₹30–45L", t: 1, u: "https://sainsburys.jobs/", l: "Bengaluru" },
  { n: "Shell Technology Centre", cat: "gcc", p: "₹28–48L", t: 1, u: "https://www.shell.in/careers.html", l: "Bengaluru" },
  { n: "Siemens Technology", cat: "gcc", p: "₹28–45L", t: 1, u: "https://jobs.siemens.com/", l: "Blr · Pune" },
  { n: "United Airlines Digital", cat: "gcc", p: "₹28–48L", t: 1, u: "https://careers.united.com/", l: "Gurugram" },
  { n: "Verizon India", cat: "gcc", p: "₹28–45L", t: 1, u: "https://mycareer.verizon.com/", l: "Chn · Hyd · Blr" },
  { n: "bp TSI", cat: "gcc", p: "₹28–45L", t: 1, u: "https://www.bp.com/en/global/corporate/careers.html", l: "Pune" },
];

export const TIER_LABEL: Record<HighPayTier, string> = {
  1: "₹25–35L",
  2: "₹35–50L",
  3: "₹50L+",
};

export const CAT_LABEL: Record<HighPayCat, string> = {
  bt: "Big Tech GCC",
  saas: "Global SaaS & Infra",
  inp: "India Product & Fintech",
  bfsi: "BFSI & Payments",
  hft: "HFT & Quant",
  semi: "Semiconductor",
  gcc: "Retail / Airlines / Industrial",
};

export const ALL_TIERS: HighPayTier[] = [3, 2, 1];
export const ALL_CATS: HighPayCat[] = ["bt", "saas", "inp", "bfsi", "hft", "semi", "gcc"];

// ---------------------------------------------------------------------------
// Aliases: how LinkedIn actually names these employers vs how the radar labels
// them. Used both for matching returned jobs AND as extra names handed to the
// actor's companyName filter, so a GCC that posts under its parent brand still
// shows up. Key = exact radar name.
// ---------------------------------------------------------------------------
export const ALIASES: Record<string, string[]> = {
  "VMware by Broadcom": ["VMware", "Broadcom"],
  "Splunk (Cisco)": ["Splunk"],
  "Juniper (HPE)": ["Juniper Networks"],
  "Booking Holdings": ["Booking.com"],
  "Zoom": ["Zoom Communications", "Zoom Video Communications"],
  "SAP Labs": ["SAP", "SAP Labs India"],
  "Eternal (Zomato · Blinkit)": ["Zomato", "Blinkit", "Eternal"],
  "Dream Sports (Dream11)": ["Dream11", "Dream Sports"],
  "InMobi / Glance": ["InMobi", "Glance"],
  "MPL": ["Mobile Premier League"],
  "Cleartrip (Flipkart)": ["Cleartrip"],
  "Airtel X Labs": ["Bharti Airtel", "Airtel"],
  "Samsung R&D (SRI-B)": ["Samsung R&D Institute India", "Samsung Research", "Samsung Electronics"],
  "Cadence": ["Cadence Design Systems"],
  "ICE (NYSE)": ["Intercontinental Exchange", "NYSE"],
  "JPMorgan Chase": ["JPMorganChase", "J.P. Morgan"],
  "HSBC Technology": ["HSBC"],
  "Citi": ["Citibank", "Citigroup"],
  "BNY": ["BNY Mellon"],
  "Fidelity": ["Fidelity Investments", "FIL India"],
  "Millennium": ["Millennium Management"],
  "Graviton Research": ["Graviton Research Capital"],
  "D. E. Shaw India": ["D. E. Shaw Group", "DE Shaw"],
  "Walmart Global Tech": ["Walmart"],
  "Target in India": ["Target"],
  "Lowe's India": ["Lowe's"],
  "Tesco Bengaluru": ["Tesco"],
  "Sainsbury's Tech": ["Sainsbury's"],
  "lululemon India Tech Hub": ["lululemon"],
  "McDonald's Global Tech": ["McDonald's"],
  "PepsiCo Digital Hub": ["PepsiCo"],
  "Maersk Technology": ["Maersk", "A.P. Moller - Maersk"],
  "FedEx ACC": ["FedEx"],
  "United Airlines Digital": ["United Airlines"],
  "American Airlines Tech Hub": ["American Airlines"],
  "Delta Technology Hub": ["Delta Air Lines"],
  "Chevron ENGINE": ["Chevron"],
  "Shell Technology Centre": ["Shell"],
  "bp TSI": ["bp", "BP"],
  "Siemens Technology": ["Siemens"],
  "Philips Innovation Campus": ["Philips"],
  "Medtronic Engineering Center": ["Medtronic"],
  "Optum (UnitedHealth)": ["Optum", "UnitedHealth Group"],
  "Evernorth (Cigna)": ["Evernorth Health Services", "The Cigna Group"],
  "Carelon (Elevance)": ["Carelon Global Solutions", "Elevance Health"],
  "Ford Business Solutions": ["Ford Motor Company", "Ford"],
  "General Motors TCI": ["General Motors"],
  "Mercedes-Benz R&D India": ["Mercedes-Benz Research & Development India", "Mercedes-Benz"],
  "Airbus India": ["Airbus"],
  "Boeing India": ["Boeing"],
  "Collins Aerospace (RTX)": ["Collins Aerospace"],
  "Marriott Tech Center": ["Marriott International"],
  "Verizon India": ["Verizon"],
  "GE Aerospace": ["GE Aerospace India"],
};

// ---------------------------------------------------------------------------
// Name matching
//
// LinkedIn's own company name rarely matches the radar label character for
// character ("Splunk (Cisco)" is just "Splunk" there; Amazon posts as "Amazon
// Web Services (AWS)"). We therefore match on a normalized form and accept a
// leading-token match, while blocking the staffing/consultancy shops that
// piggyback on a big brand name.
// ---------------------------------------------------------------------------

/** Lower-case, strip punctuation & bracketed suffixes, collapse whitespace. */
export function normCompany(raw: string): string {
  return (raw || "")
    .toLowerCase()
    .replace(/\(.*?\)/g, " ")      // drop "(Cisco)", "(AWS)" ...
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\b(pvt|private|ltd|limited|inc|llc|llp|corp|corporation|co)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Words that may trail a brand name and still mean the same employer. */
const SOFT_SUFFIX = new Set([
  "india", "india2", "labs", "lab", "technologies", "technology", "tech",
  "software", "systems", "solutions", "services", "service", "global",
  "development", "developement", "centre", "center", "centres", "centers",
  "gcc", "gic", "r", "d", "rnd", "research", "innovation", "digital",
  "engineering", "cloud", "web", "group", "holdings", "international",
  "enterprise", "enterprises", "capability", "consulting", "products",
  "platform", "operations", "bengaluru", "bangalore", "hyderabad", "pune",
  "chennai", "noida", "gurgaon", "gurugram", "mumbai", "delhi",
]);

/** Obvious recruiter / body-shop markers — never treat these as the brand. */
const BLOCK_WORDS =
  /\b(staffing|recruit\w*|manpower|placement|consultancy|hiring|talent|hr\s|outsourc\w*|staffers|jobs?)\b/i;

interface Indexed {
  key: string;
  tokens: string[];
  company: HighPayCompany;
}

let INDEX: Indexed[] | null = null;

function index(): Indexed[] {
  if (INDEX) return INDEX;
  const rows: Indexed[] = [];
  const seen = new Set<string>();
  for (const c of HIGH_PAY_COMPANIES) {
    for (const label of [c.n, ...(ALIASES[c.n] ?? [])]) {
      const key = normCompany(label);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      rows.push({ key, tokens: key.split(" ").filter(Boolean), company: c });
    }
  }
  // longest names first so "General Motors" wins over a shorter prefix
  INDEX = rows.sort((a, b) => b.tokens.length - a.tokens.length);
  return INDEX;
}

/**
 * Resolve a LinkedIn company name to a High Pay Radar company, or null.
 * Exact normalized match first, then "brand + soft suffix" (e.g.
 * "Amazon Development Centre India" -> Amazon).
 */
export function matchHighPayCompany(rawName: string): HighPayCompany | null {
  const name = (rawName || "").trim();
  if (!name) return null;
  if (BLOCK_WORDS.test(name)) return null;

  const norm = normCompany(name);
  if (!norm) return null;
  const tokens = norm.split(" ").filter(Boolean);

  for (const entry of index()) {
    if (entry.key === norm) return entry.company;
  }

  for (const entry of index()) {
    const n = entry.tokens.length;
    if (tokens.length <= n) continue;
    let leads = true;
    for (let i = 0; i < n; i++) {
      if (tokens[i] !== entry.tokens[i]) {
        leads = false;
        break;
      }
    }
    if (!leads) continue;
    // every trailing word must be a harmless suffix ("India", "Labs", ...)
    const rest = tokens.slice(n);
    if (rest.length > 3) continue;
    if (rest.every((w) => SOFT_SUFFIX.has(w))) return entry.company;
  }

  return null;
}

/** The list of names to hand to the Apify actor's `companyName` filter. */
export function searchNames(companies: HighPayCompany[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const c of companies) {
    // "Splunk (Cisco)" -> "Splunk"; LinkedIn knows the plain brand. Aliases go
    // in too, so a GCC posting under its parent brand is still searched.
    const plain = c.n.replace(/\(.*?\)/g, "").replace(/\s+/g, " ").trim();
    for (const label of [plain, ...(ALIASES[c.n] ?? [])]) {
      const k = label.toLowerCase();
      if (!label || seen.has(k)) continue;
      seen.add(k);
      out.push(label);
    }
  }
  return out;
}

/** Companies left after the board's tier / sector selection. */
export function selectCompanies(tiers: HighPayTier[], cats: HighPayCat[]): HighPayCompany[] {
  const t = new Set(tiers.length ? tiers : ALL_TIERS);
  const c = new Set(cats.length ? cats : ALL_CATS);
  return HIGH_PAY_COMPANIES.filter((x) => t.has(x.t) && c.has(x.cat));
}

/** Split a name list into batches for the Apify `companyName` filter. */
export function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += Math.max(1, size)) out.push(arr.slice(i, i + Math.max(1, size)));
  return out;
}
