export const dynamic = "force-dynamic";

export async function GET() {
  const teamId = process.env.APPLE_TEAM_ID;
  const bundleId = process.env.IOS_BUNDLE_ID ?? "fun.pesalo.Pesalo";
  const appId = teamId ? `${teamId}.${bundleId}` : null;

  return Response.json(
    {
      webcredentials: {
        apps: appId ? [appId] : []
      },
      applinks: {
        apps: [],
        details: appId
          ? [
              {
                appIDs: [appId],
                components: [{ "/": "/*" }]
              }
            ]
          : []
      }
    },
    {
      headers: {
        "content-type": "application/json"
      }
    }
  );
}
