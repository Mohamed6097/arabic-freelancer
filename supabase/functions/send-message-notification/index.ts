import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface MessageNotificationRequest {
  receiverId: string;
  senderName: string;
  messagePreview: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Client bound to the user session (for JWT validation)
    const supabaseAuth = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
    if (claimsError || !claimsData?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }
    const senderUserId = claimsData.claims.sub;

    const { receiverId, senderName, messagePreview }: MessageNotificationRequest = await req.json();

    if (!receiverId || !messagePreview) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Service client (needed to read auth user email)
    const supabase = createClient(supabaseUrl, serviceKey);

    // Get receiver's profile to find their email
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("user_id, full_name")
      .eq("id", receiverId)
      .single();

    if (profileError || !profile) {
      console.error("Profile not found:", profileError);
      return new Response(JSON.stringify({ error: "Profile not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Get user's email from auth.users
    const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(profile.user_id);

    if (authError || !authUser?.user?.email) {
      console.error("Auth user not found:", authError);
      return new Response(JSON.stringify({ error: "User email not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const receiverEmail = authUser.user.email;
    const receiverName = profile.full_name;

    // Derive sender name from the authenticated user (prevents spoofing)
    let effectiveSenderName = senderName;
    try {
      const { data: senderProfile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", senderUserId)
        .maybeSingle();
      if (senderProfile?.full_name) effectiveSenderName = senderProfile.full_name;
    } catch {
      // ignore
    }

    // Send email notification
    const emailResponse = await resend.emails.send({
      from: "منصة تاسكاتى <noreply@resend.dev>",
      to: [receiverEmail],
      subject: `رسالة جديدة من ${effectiveSenderName}`,
      html: `
        <!DOCTYPE html>
        <html dir="rtl" lang="ar">
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px; }
            .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; padding: 32px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
            .header { text-align: center; margin-bottom: 24px; }
            .header h1 { color: #6366f1; margin: 0; font-size: 24px; }
            .content { background: #f8fafc; border-radius: 8px; padding: 20px; margin: 20px 0; }
            .message-preview { color: #374151; font-size: 16px; line-height: 1.6; }
            .sender-name { color: #6366f1; font-weight: bold; }
            .cta { text-align: center; margin-top: 24px; }
            .cta a { background: #6366f1; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block; }
            .footer { text-align: center; margin-top: 32px; color: #9ca3af; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📩 رسالة جديدة</h1>
            </div>
            <p>مرحباً ${receiverName}،</p>
            <p>لديك رسالة جديدة من <span class="sender-name">${effectiveSenderName}</span></p>
            <div class="content">
              <p class="message-preview">${messagePreview}</p>
            </div>
            <div class="cta">
              <a href="https://arabic-freelancer.lovable.app/messages">عرض الرسالة</a>
            </div>
            <div class="footer">
              <p>منصة تاسكاتى للعمل الحر</p>
              <p>هذه رسالة تلقائية، لا ترد عليها</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    if (emailResponse?.error) {
      console.error("Resend error:", emailResponse.error);
      return new Response(
        JSON.stringify({
          error: emailResponse.error.message || "Email sending failed",
          provider: "resend",
        }),
        {
          status: 502,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log("Email notification sent:", emailResponse?.data?.id);

    return new Response(JSON.stringify({ success: true, id: emailResponse?.data?.id }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-message-notification function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
