import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.90.1";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  type: "reservation_approved" | "reservation_rejected" | "issue_resolved";
  userId: string;
  details: {
    deviceName?: string;
    startDate?: string;
    endDate?: string;
    issueTitle?: string;
    resolution?: string;
    reason?: string;
  };
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { type, userId, details }: NotificationRequest = await req.json();

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("email, full_name")
      .eq("user_id", userId)
      .single();

    if (profileError || !profile) {
      throw new Error("User profile not found");
    }

    let subject = "";
    let html = "";

    switch (type) {
      case "reservation_approved":
        subject = "Reserva Aprovada - Sistema de Gestão de Equipamentos";
        html = `
          <h1>Olá ${profile.full_name}!</h1>
          <p>A sua reserva foi <strong style="color: green;">aprovada</strong>.</p>
          <h3>Detalhes da Reserva:</h3>
          <ul>
            <li><strong>Equipamento:</strong> ${details.deviceName}</li>
            <li><strong>Data de início:</strong> ${details.startDate}</li>
            <li><strong>Data de fim:</strong> ${details.endDate}</li>
          </ul>
          <p>Por favor, levante o equipamento na data indicada.</p>
          <p>Cumprimentos,<br>Equipa de Gestão de Equipamentos</p>
        `;
        break;

      case "reservation_rejected":
        subject = "Reserva Rejeitada - Sistema de Gestão de Equipamentos";
        html = `
          <h1>Olá ${profile.full_name}!</h1>
          <p>Lamentamos informar que a sua reserva foi <strong style="color: red;">rejeitada</strong>.</p>
          <h3>Detalhes da Reserva:</h3>
          <ul>
            <li><strong>Equipamento:</strong> ${details.deviceName}</li>
            <li><strong>Data de início:</strong> ${details.startDate}</li>
            <li><strong>Data de fim:</strong> ${details.endDate}</li>
          </ul>
          ${details.reason ? `<p><strong>Motivo:</strong> ${details.reason}</p>` : ""}
          <p>Por favor, contacte a administração para mais informações.</p>
          <p>Cumprimentos,<br>Equipa de Gestão de Equipamentos</p>
        `;
        break;

      case "issue_resolved":
        subject = "Avaria Resolvida - Sistema de Gestão de Equipamentos";
        html = `
          <h1>Olá ${profile.full_name}!</h1>
          <p>A avaria que reportou foi <strong style="color: green;">resolvida</strong>.</p>
          <h3>Detalhes:</h3>
          <ul>
            <li><strong>Problema:</strong> ${details.issueTitle}</li>
            <li><strong>Resolução:</strong> ${details.resolution || "Problema corrigido"}</li>
          </ul>
          <p>Obrigado por reportar o problema.</p>
          <p>Cumprimentos,<br>Equipa de Gestão de Equipamentos</p>
        `;
        break;
    }

    const emailResponse = await resend.emails.send({
      from: "Gestão de Equipamentos <onboarding@resend.dev>",
      to: [profile.email],
      subject,
      html,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-notification function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
