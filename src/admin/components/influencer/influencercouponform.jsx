import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useAdminPanelBasePath } from "../../../context/AdminPanelBasePathContext";
import { btnOutline, formPageWrap, formToolbar, FormSection } from "./influencerShared";

const InfluencerCouponForm = () => {
  const navigate = useNavigate();
  const basePath = useAdminPanelBasePath();
  const ap = (suffix) =>
    `${basePath}/${String(suffix || "").replace(/^\/+/, "")}`.replace(/\/+/g, "/");

  return (
    <div className={formPageWrap}>
      <div className={formToolbar}>
        <button type="button" onClick={() => navigate(ap("influencer/coupons"))} className={btnOutline}>
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          Back
        </button>
        <h1 className="mr-auto min-w-0 text-base font-bold tracking-tight sm:text-lg">
          Influencer coupon form
        </h1>
      </div>
      <FormSection title="Not in use" hint="Attach and detach coupons from the influencer coupons list.">
        <p className="text-[11px] text-stone-600">
          This route is reserved. Open{" "}
          <button
            type="button"
            className="font-medium text-brand-600 hover:underline"
            onClick={() => navigate(ap("influencer/coupons"))}
          >
            Influencer coupons
          </button>{" "}
          and select an influencer to manage their coupons.
        </p>
      </FormSection>
    </div>
  );
};

export default InfluencerCouponForm;
