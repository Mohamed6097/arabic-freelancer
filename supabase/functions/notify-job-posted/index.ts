import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface JobNotificationRequest {
  projectId: string;
  projectTitle: string;
  projectCategory: string;
  clientName: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { projectId, projectTitle, projectCategory, clientName }: JobNotificationRequest = await req.json();

    console.log("Notifying users about new job:", projectTitle);

    // Get all users (both freelancers and clients) to send in-app notifications
    const { data: allUsers, error: usersError } = await supabase
      .from("profiles")
      .select("id, full_name, user_type");

    if (usersError) {
      console.error("Error fetching users:", usersError);
      throw usersError;
    }

    // Create in-app notifications for all users
    let notificationCount = 0;
    if (allUsers && allUsers.length > 0) {
      const notifications = allUsers.map(user => ({
        user_id: user.id,
        type: 'job_posted',
        title: 'مشروع جديد متاح',
        message: `تم نشر مشروع جديد: ${projectTitle} في تصنيف ${projectCategory} بواسطة ${clientName}`,
        link: `/projects/${projectId}`,
        is_read: false,
      }));

      const { error: notifyError } = await supabase
        .from("notifications")
        .insert(notifications);

      if (notifyError) {
        console.error("Error creating notifications:", notifyError);
      } else {
        notificationCount = notifications.length;
        console.log(`Created ${notificationCount} in-app notifications`);
      }
    }

    // Send email notifications to ALL users
    let sentCount = 0;
    for (const user of allUsers || []) {
      try {
        // Get user_id from profile to fetch email
        const { data: profileData } = await supabase
          .from("profiles")
          .select("user_id")
          .eq("id", user.id)
          .single();

        if (!profileData?.user_id) {
          console.log(`Skipping user ${user.id}: no user_id found`);
          continue;
        }

        const { data: userData, error: userError } = await supabase.auth.admin.getUserById(profileData.user_id);

        if (userError || !userData?.user?.email) {
          console.log(`Skipping user ${profileData.user_id}: no email found`);
          continue;
        }

        const email = userData.user.email;

        await resend.emails.send({
          from: "منصة تاسكاتى <noreply@arabicfreelancer.dev>",
          to: [email],
          subject: `مشروع جديد: ${projectTitle}`,
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
                .project-title { color: #1f2937; font-size: 18px; font-weight: bold; margin-bottom: 8px; }
                .project-category { color: #6366f1; font-size: 14px; background: #e0e7ff; padding: 4px 12px; border-radius: 20px; display: inline-block; }
                .client-name { color: #6b7280; font-size: 14px; margin-top: 12px; }
                .cta { text-align: center; margin-top: 24px; }
                .cta a { background: #6366f1; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block; }
                .footer { text-align: center; margin-top: 32px; color: #9ca3af; font-size: 12px; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>🆕 مشروع جديد متاح</h1>
                </div>
                <p>مرحباً ${user.full_name}،</p>
                <p>تم نشر مشروع جديد على المنصة:</p>
                <div class="content">
                  <p class="project-title">${projectTitle}</p>
                  <span class="project-category">${projectCategory}</span>
                  <p class="client-name">صاحب المشروع: ${clientName}</p>
                </div>
                <div class="cta">
                  <a href="https://arabic-freelancer.lovable.app/projects/${projectId}">عرض المشروع</a>
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

        sentCount++;
        console.log(`Email sent to ${email}`);
      } catch (emailError) {
        console.error(`Failed to send email to user ${user.id}:`, emailError);
      }
    }

    console.log(`Job notification: ${notificationCount} in-app, ${sentCount} emails sent`);

    return new Response(JSON.stringify({ success: true, sent: sentCount, notifications: notificationCount }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in notify-job-posted function:", error);
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
