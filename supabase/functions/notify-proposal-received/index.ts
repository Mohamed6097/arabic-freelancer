import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ProposalNotificationRequest {
  clientId: string;
  freelancerName: string;
  projectTitle: string;
  projectId: string;
  proposedBudget: number;
  estimatedDays: number;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { clientId, freelancerName, projectTitle, projectId, proposedBudget, estimatedDays }: ProposalNotificationRequest = await req.json();

    console.log("Notifying client about new proposal on:", projectTitle);

    // Get client profile to find user_id
    const { data: clientProfile, error: profileError } = await supabase
      .from("profiles")
      .select("user_id, full_name")
      .eq("id", clientId)
      .single();

    if (profileError || !clientProfile?.user_id) {
      throw new Error("Client profile not found");
    }

    // Get client email
    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(clientProfile.user_id);

    if (userError || !userData?.user?.email) {
      throw new Error("Client email not found");
    }

    // Create in-app notification
    await supabase.from("notifications").insert({
      user_id: clientId,
      type: "proposal_received",
      title: "عرض جديد على مشروعك",
      message: `قدّم ${freelancerName} عرضاً على مشروعك "${projectTitle}" بمبلغ ${proposedBudget} وخلال ${estimatedDays} يوم`,
      link: `/projects/${projectId}`,
      is_read: false,
    });

    // Send email
    const email = userData.user.email;
    await resend.emails.send({
      from: "منصة تاسكاتى <noreply@arabicfreelancer.dev>",
      to: [email],
      subject: `عرض جديد على مشروعك: ${projectTitle}`,
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
            .detail { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0; }
            .detail:last-child { border-bottom: none; }
            .label { color: #6b7280; }
            .value { font-weight: bold; color: #1f2937; }
            .cta { text-align: center; margin-top: 24px; }
            .cta a { background: #6366f1; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block; }
            .footer { text-align: center; margin-top: 32px; color: #9ca3af; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📩 عرض جديد على مشروعك</h1>
            </div>
            <p>مرحباً ${clientProfile.full_name}،</p>
            <p>قدّم مستقل عرضاً جديداً على مشروعك:</p>
            <div class="content">
              <div class="detail">
                <span class="label">المشروع</span>
                <span class="value">${projectTitle}</span>
              </div>
              <div class="detail">
                <span class="label">المستقل</span>
                <span class="value">${freelancerName}</span>
              </div>
              <div class="detail">
                <span class="label">الميزانية المقترحة</span>
                <span class="value">${proposedBudget}</span>
              </div>
              <div class="detail">
                <span class="label">مدة التنفيذ</span>
                <span class="value">${estimatedDays} يوم</span>
              </div>
            </div>
            <div class="cta">
              <a href="https://arabic-freelancer.lovable.app/projects/${projectId}">مراجعة العرض</a>
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

    console.log(`Proposal notification sent to ${email}`);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in notify-proposal-received:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
