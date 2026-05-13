/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: "https://iroh.africa",
  generateRobotsTxt: true,
  robotsTxtOptions: {
    policies: [{ userAgent: "*", allow: "/" }],
  },
};
