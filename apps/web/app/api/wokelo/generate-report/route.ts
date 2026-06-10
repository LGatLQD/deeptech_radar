import { NextRequest, NextResponse } from "next/server";
import { wokeloFetch } from "@/lib/wokelo";

function cleanCompanyName(name: string): string {
  return name
    .replace(/\bLIMITED\b/gi, "")
    .replace(/\bLTD\b/gi, "")
    .replace(/\bPLC\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

export async function POST(req: NextRequest) {
  try {
    const { company } = await req.json();

    if (!company) {
      return NextResponse.json(
        { success: false, error: "company is required" },
        { status: 400 }
      );
    }

    const searchQuery = cleanCompanyName(company);

    const search = await wokeloFetch(
      `/api/enterprise/company/search?query=${encodeURIComponent(
        searchQuery
      )}&search_by=name&company_type=all`
    );

    const match = search?.data?.[0];

    if (!match?.permalink) {
      return NextResponse.json(
        {
          success: false,
          error: `No Wokelo company match found for ${company}`,
          searchQuery,
          search,
        },
        { status: 404 }
      );
    }

    const result = await wokeloFetch(
      "/api/enterprise/company/enrich/single/",
      {
        method: "POST",
        body: JSON.stringify({
          company: match.permalink,
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
      inputCompany: company,
      searchQuery,
      matchedCompany: match,
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