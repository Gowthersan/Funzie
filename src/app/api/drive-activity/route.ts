import { google } from "googleapis";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { db } from "@/lib/db";

import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  console.log("📩 Notification received!", req.headers);

  return NextResponse.json(
    { message: "Notification received" },
    { status: 200 }
  );
}

export async function GET() {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.OAUTH2_REDIRECT_URI
  );

  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ message: "User not found" });
  }

  const clerkResponse = await (
    await clerkClient()
  ).users.getUserOauthAccessToken(userId, "google");

  const accessToken = clerkResponse.data[0].token;
  oauth2Client.setCredentials({
    access_token: accessToken
  });

  const drive = google.drive({
    version: "v3",
    auth: oauth2Client
  });

  console.log(drive);

  const channelId = uuidv4();

  const startPageTokenRes = await drive.changes.getStartPageToken({});
  const startPageToken = startPageTokenRes.data.startPageToken;
  if (startPageToken == null) {
    throw new Error("startPageToken is unexpectedly null");
  }

  const listener = await drive.changes.watch({
    pageToken: startPageToken,
    supportsAllDrives: true,
    supportsTeamDrives: true,
    requestBody: {
      id: channelId,
      type: "web_hook",
      address: `${process.env.NGROK_URI}/api/drive-activity/notification`,
      kind: "api#channel"
    }
  });

  if (listener.status == 200) {
    //if listener created store its channel id in db
    const channelStored = await db.user.updateMany({
      where: {
        clerkId: userId
      },
      data: {
        googleResourceId: listener.data.resourceId
      }
    });

    if (channelStored) {
      return new NextResponse("Listening to changes...");
    }
  }

  return new NextResponse("Oops! something went wrong, try again");
}
