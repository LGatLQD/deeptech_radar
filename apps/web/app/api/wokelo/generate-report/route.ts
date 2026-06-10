import { NextRequest, NextResponse } from "next/server";
import { wokeloFetch } from "@/lib/wokelo";

export async function POST(req: NextRequest) {
  try {
    const { company } = await req.json();

    if (!company) {
      return NextResponse.json(
        { success: false, error: "company is required" },
        { status: 400 }
      );
    }

    const result = await wokeloFetch(
      "/api/enterprise/company/enrich/single/",
      {
        method: "POST",
        body: JSON.stringify({
          company,
          sections: [
            "firmographics",
            "funding",
            "headcount",
            "gtm_and_business_model",
            "uk_private_company_financials",
            "acquisitions",
            "website_traffic",
          ],
        }),
      }
    );

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}