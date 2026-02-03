import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface WelcomeRequest {
  userId: string;
  userEmail: string;
  fullName: string;
  userType: 'client' | 'freelancer';
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { userId, userEmail, fullName, userType }: WelcomeRequest = await req.json();

    console.log(`Sending welcome email to ${fullName} (${userType})`);

    // For freelancers, get open projects to notify them about
    let projectsHtml = '';
    if (userType === 'freelancer') {
      const { data: projects, error: projectsError } = await supabase
        .from("projects")
        .select(`
          id,
          title,
          category,
          budget_min,
          budget_max,
          client_id,
          profiles!projects_client_id_fkey (full_name)
        `)
        .eq("status", "open")
        .order("created_at", { ascending: false })
        .limit(5);

      if (!projectsError && projects && projects.length > 0) {
        projectsHtml = `
          <h2 style="color: #1f2937; font-size: 18px; margin-top: 24px;">مشاريع متاحة حالياً:</h2>
          <div style="background: #f8fafc; border-radius: 8px; padding: 16px; margin: 12px 0;">
            ${projects.map((p: any) => `
              <div style="border-bottom: 1px solid #e5e7eb; padding: 12px 0;">
                <a href="https://arabic-freelancer.lovable.app/projects/${p.id}" style="color: #6366f1; font-weight: bold; text-decoration: none; font-size: 16px;">${p.title}</a>
                <p style="color: #6b7280; margin: 4px 0; font-size: 14px;">
                  التصنيف: ${p.category} ${p.budget_min && p.budget_max ? `| الميزانية: ${p.budget_min} - ${p.budget_max} جنيه` : ''}
                </p>
              </div>
            `).join('')}
          </div>
          <div style="text-align: center; margin-top: 20px;">
            <a href="https://arabic-freelancer.lovable.app/projects" style="background: #6366f1; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">تصفح جميع المشاريع</a>
          </div>
        `;
      }
    }

    const welcomeMessage = userType === 'freelancer' 
      ? 'نحن سعداء بانضمامك إلى منصة تاسكاتى! يمكنك الآن تصفح المشاريع المتاحة وتقديم عروضك.'
      : 'نحن سعداء بانضمامك إلى منصة تاسكاتى! يمكنك الآن نشر مشاريعك والعثور على أفضل المستقلين.';

    const ctaButton = userType === 'freelancer'
      ? '<a href="https://arabic-freelancer.lovable.app/projects" style="background: #6366f1; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">تصفح المشاريع</a>'
      : '<a href="https://arabic-freelancer.lovable.app/new-project" style="background: #6366f1; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">انشر مشروعك الأول</a>';

    await resend.emails.send({
      from: "منصة تاسكاتى <noreply@resend.dev>",
      to: [userEmail],
      subject: `مرحباً ${fullName}! 🎉 أهلاً بك في تاسكاتى`,
      html: `
        <!DOCTYPE html>
        <html dir="rtl" lang="ar">
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px; }
            .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; padding: 32px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
            .header { text-align: center; margin-bottom: 24px; }
            .header h1 { color: #6366f1; margin: 0; font-size: 28px; }
            .emoji { font-size: 48px; margin-bottom: 16px; }
            .content { color: #374151; font-size: 16px; line-height: 1.8; }
            .cta { text-align: center; margin-top: 24px; }
            .footer { text-align: center; margin-top: 32px; color: #9ca3af; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="emoji">🎉</div>
              <h1>مرحباً ${fullName}!</h1>
            </div>
            <div class="content">
              <p>${welcomeMessage}</p>
              ${projectsHtml}
              ${!projectsHtml ? `<div class="cta">${ctaButton}</div>` : ''}
            </div>
            <div class="footer">
              <p>منصة تاسكاتى للعمل الحر</p>
              <p>نتمنى لك تجربة ممتعة ومثمرة!</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    console.log(`Welcome email sent to ${userEmail}`);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in welcome-new-user function:", error);
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
