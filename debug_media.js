
const { getImageUrl } = require('./utils/media');

// PathPresenter URL with expired token (se=2025-12-20)
// Current Date: 2025-12-21 (or later)
const expiredUrl = "https://pathpresenter.blob.core.windows.net/pathpresenterdata/Raj_Skin/Scabies%20mite%20and%20scybala_files/8/0_0.jpeg?sig=lhQDBbNHsDm3TFC%2FKbCR%2F99oCqeTzFayNnT4DolWfLQ%3D&st=2025-12-20T23%3A06%3A14Z&se=2025-12-20T23%3A36%3A14Z&sv=2018-03-28&sp=r&sr=c";

// WHO URL (Confirmed 404)
const whoUrl = "https://tumourclassification.iarc.who.int/static/dzi/35064_files/10/0_0.jpeg";

console.log("Current Date:", new Date().toISOString());

const resultExpired = getImageUrl(expiredUrl);
console.log("Expired Result (Expected null):", resultExpired);

const resultWho = getImageUrl(whoUrl);
console.log("WHO Result (Should we filter this?):", resultWho);
