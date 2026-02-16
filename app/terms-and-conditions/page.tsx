import Link from "next/link";
import { CircleDot } from "lucide-react";

export const metadata = {
  title: "Terms & Conditions | SHREEJI Investments Limited",
  description:
    "Terms & Conditions and policies for SHREEJI Investments Limited. Review our Refund, Cancellation, and Shipping policies.",
};

const policyNavItems = [
  {
    href: "#refund",
    label: "Refund Policy",
    description: "Refund, returns, and eligibility conditions for purchases.",
    isAnchor: true,
  },
  {
    href: "#cancellation",
    label: "Cancellation Policy",
    description: "Order cancellation terms and conditions.",
    isAnchor: true,
  },
  {
    href: "#shipping",
    label: "Shipping/Delivery Policy",
    description: "Shipping, delivery timelines, and related terms.",
    isAnchor: true,
  },
];

export default function TermsPage() {
  return (
    <div
      className="min-h-screen w-full pt-24 pb-12 px-4 sm:px-6 lg:px-8 bg-[beige]">
      <div className="flex flex-col md:flex-row gap-6 lg:gap-8 align-start w-full max-w-7xl mx-auto">
        {/* Left sidebar - product-page style */}
        <aside className="hidden md:flex flex-[2] max-w-[280px] min-w-0 flex-col shrink-0 sticky top-28 self-start max-h-[85vh] overflow-y-auto rounded-2xl">
          <nav className="bg-[var(--shreeji-primary)] flex min-w-0 flex-col px-5 py-7 rounded-2xl">
            <ul className="flex min-w-0 flex-col">
              {policyNavItems.map((item, index) => (
                <li
                  key={item.href + index}
                  className="mr-2 min-w-0 px-2 flex flex-col gap-1 border-b border-white/20 py-4 last:border-none"
                >
                  <div className="flex min-w-0 gap-3 items-center">
                    <CircleDot
                      color="#ffffff"
                      strokeWidth={3}
                      size={20}
                      className="shrink-0"
                    />
                    {item.isAnchor ? (
                      <a
                        href={item.href}
                        className="font-medium text-white hover:underline break-words min-w-0"
                      >
                        {item.label}
                      </a>
                    ) : (
                      <Link
                        href={item.href}
                        className="font-medium text-white hover:underline break-words min-w-0"
                      >
                        {item.label}
                      </Link>
                    )}
                  </div>
                  <p className="text-gray-200 text-sm ml-8 mt-0.5 break-words min-w-0">
                    {item.description}
                  </p>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0">
          {/* Mobile: in-page nav */}
          <ul className="md:hidden space-y-4 mb-10 break-words">
            {policyNavItems.map((item, index) => (
              <li key={item.href + index}>
                {item.isAnchor ? (
                  <a
                    href={item.href}
                    className="text-lg font-medium text-[#807045] hover:underline"
                  >
                    {item.label}
                  </a>
                ) : (
                  <Link
                    href={item.href}
                    className="text-lg font-medium text-[#807045] hover:underline"
                  >
                    {item.label}
                  </Link>
                )}
                <p className="text-gray-600 text-sm mt-1">{item.description}</p>
              </li>
            ))}
          </ul>

          <h1 className="text-3xl font-bold text-[var(--shreeji-primary)] mb-4">
            Terms & Conditions
          </h1>
          <p className="text-gray-600 mb-10">
            Please review our policies below. By using our website and services,
            you agree to these terms.
          </p>

          <article className="prose prose-gray w-full min-w-0 max-w-4xl break-words [overflow-wrap:anywhere] [&_p]:break-words [&_li]:break-words [&_h3]:break-words [&_h4]:break-words">
          <h2 className="text-2xl font-bold text-[var(--shreeji-primary)] mb-2">
            REFUND, RETURNS & CANCELLATION POLICY
          </h2>

          <section id="refund" className="mb-8 scroll-mt-24">
            <h3 className="text-xl font-semibold text-[var(--shreeji-primary)] mb-3">
              1. Policy Scope
            </h3>
            <p className="text-gray-700 mb-3">
              This Refund, Returns & Cancellation Policy governs all purchases
              made through SHREEJI Investments Limited&apos;s website, digital
              platforms, physical locations, and authorised sales channels. By
              completing a purchase, the customer agrees to this policy in full.
            </p>
            <p className="text-gray-700 mb-3">This policy applies to:</p>
            <ul className="list-disc pl-6 space-y-1 text-gray-700">
              <li>IT equipment and related hardware</li>
              <li>Printing, branding, and customised production services</li>
              <li>Business process outsourcing services</li>
              <li>Digital, technical, and consulting services</li>
              <li>
                Any other products or services offered by SHREEJI Investments
                Limited
              </li>
            </ul>
          </section>

          <section className="mb-8">
            <h3 className="text-xl font-semibold text-[var(--shreeji-primary)] mb-3">
              2. General Refund Principle
            </h3>
            <p className="text-gray-700 mb-3">
              All sales are considered final unless a refund request meets the
              eligibility conditions outlined in this policy. Refunds are
              granted solely at the discretion of SHREEJI Investments Limited
              following validation of the transaction and claim.
            </p>
            <p className="text-gray-700">
              Approval of refunds does not constitute an admission of liability.
            </p>
          </section>

          <section className="mb-8">
            <h3 className="text-xl font-semibold text-[var(--shreeji-primary)] mb-3">
              3. Valid Grounds for Refund Consideration
            </h3>
            <p className="text-gray-700 mb-3">
              Refund requests may be considered only where:
            </p>
            <h4 className="text-lg font-medium text-[var(--shreeji-primary)] mt-4 mb-2">
              3.1 Product Issues
            </h4>
            <ul className="list-disc pl-6 space-y-1 text-gray-700 mb-4">
              <li>
                Goods delivered are materially defective, damaged at delivery, or
                non-functional
              </li>
              <li>
                Goods supplied materially differ from the confirmed order
                specifications
              </li>
              <li>Incorrect items supplied due to SHREEJI error</li>
              <li>Verified incomplete delivery of paid-for items</li>
            </ul>
            <h4 className="text-lg font-medium text-[var(--shreeji-primary)] mt-4 mb-2">
              3.2 Service Delivery Issues
            </h4>
            <ul className="list-disc pl-6 space-y-1 text-gray-700 mb-4">
              <li>
                Paid service not delivered within agreed contractual timelines
                without reasonable cause
              </li>
              <li>
                Documented production or execution error directly attributable
                to SHREEJI
              </li>
              <li>
                Technical failure preventing delivery where remediation is not
                feasible
              </li>
            </ul>
            <h4 className="text-lg font-medium text-[var(--shreeji-primary)] mt-4 mb-2">
              3.3 Payment or Transaction Errors
            </h4>
            <ul className="list-disc pl-6 space-y-1 text-gray-700">
              <li>Duplicate payments confirmed through financial records</li>
              <li>Verified billing or system processing error</li>
              <li>
                Order cancellation approved prior to production, dispatch, or
                service initiation
              </li>
            </ul>
          </section>

          <section className="mb-8">
            <h3 className="text-xl font-semibold text-[var(--shreeji-primary)] mb-3">
              4. Non-Refundable Transactions
            </h3>
            <p className="text-gray-700 mb-3">
              Refunds shall NOT be issued under the following circumstances:
            </p>
            <ul className="list-disc pl-6 space-y-1 text-gray-700">
              <li>Change of mind, preference, or subjective dissatisfaction</li>
              <li>
                Customised, branded, printed, configured, or special-order
                items once production or procurement has commenced
              </li>
              <li>
                Customer-provided incorrect specifications, artwork,
                measurements, or instructions
              </li>
              <li>
                Normal variations in colour, finish, or output inherent in
                printing or manufacturing processes
              </li>
              <li>
                Damage caused after delivery due to handling, installation,
                misuse, negligence, or external factors
              </li>
              <li>
                Delays caused by logistics providers, customs clearance, force
                majeure events, or third-party service dependencies
              </li>
              <li>
                Promotional, clearance, discounted, or final-sale items unless
                defective
              </li>
              <li>Digital, consulting, or technical services already rendered</li>
            </ul>
          </section>

          <section className="mb-8">
            <h3 className="text-xl font-semibold text-[var(--shreeji-primary)] mb-3">
              5. Refund Request Procedure
            </h3>
            <p className="text-gray-700 mb-3">To request a refund:</p>
            <ul className="list-disc pl-6 space-y-1 text-gray-700 mb-3">
              <li>
                Written notice must be submitted within 7 calendar days of
                delivery or service completion.
              </li>
              <li>
                Requests must include: Proof of purchase or order reference;
                Detailed reason for the request; Supporting documentation or
                photographic evidence where applicable
              </li>
              <li>
                Requests must be submitted through official SHREEJI communication
                channels as listed on the website.
              </li>
            </ul>
            <p className="text-gray-700">
              Failure to follow this process may result in automatic rejection.
            </p>
          </section>

          <section className="mb-8">
            <h3 className="text-xl font-semibold text-[var(--shreeji-primary)] mb-3">
              6. Inspection, Verification & Approval
            </h3>
            <p className="text-gray-700 mb-3">
              SHREEJI Investments Limited reserves the right to:
            </p>
            <ul className="list-disc pl-6 space-y-1 text-gray-700 mb-3">
              <li>Inspect returned products before approving refunds</li>
              <li>Request additional documentation or verification</li>
              <li>Conduct technical or financial validation checks</li>
              <li>
                Reject claims deemed fraudulent, incomplete, or unverifiable
              </li>
            </ul>
            <p className="text-gray-700">
              Refund approval timelines may vary depending on investigation
              requirements.
            </p>
          </section>

          <section className="mb-8">
            <h3 className="text-xl font-semibold text-[var(--shreeji-primary)] mb-3">
              7. Refund Method & Processing Time
            </h3>
            <p className="text-gray-700 mb-3">Where approved:</p>
            <ul className="list-disc pl-6 space-y-1 text-gray-700 mb-3">
              <li>
                Refunds will generally be processed within 7–21 business days
              </li>
              <li>
                Refunds will typically be issued via the original payment method
              </li>
              <li>
                SHREEJI may alternatively offer: Product replacement; Service
                correction; Store credit or account credit
              </li>
            </ul>
            <p className="text-gray-700">
              Banking, mobile money, or payment gateway delays are outside
              SHREEJI&apos;s control.
            </p>
          </section>

          <section className="mb-8">
            <h3 className="text-xl font-semibold text-[var(--shreeji-primary)] mb-3">
              8. Returns Conditions
            </h3>
            <p className="text-gray-700 mb-3">
              Where product return is required:
            </p>
            <ul className="list-disc pl-6 space-y-1 text-gray-700">
              <li>Items must be unused unless defective</li>
              <li>
                Original packaging, accessories, manuals, and proof of purchase
                must be provided
              </li>
              <li>
                Customer may bear return shipping costs unless the error is
                attributable to SHREEJI
              </li>
              <li>
                Risk during return transit remains with the customer until
                received by SHREEJI
              </li>
            </ul>
          </section>

          <section id="cancellation" className="mb-8 scroll-mt-24">
            <h3 className="text-xl font-semibold text-[var(--shreeji-primary)] mb-3">
              9. Cancellation Policy
            </h3>
            <p className="text-gray-700 mb-3">Orders may only be cancelled:</p>
            <ul className="list-disc pl-6 space-y-1 text-gray-700 mb-3">
              <li>Before procurement, production, or dispatch begins</li>
              <li>With written confirmation from SHREEJI</li>
            </ul>
            <p className="text-gray-700">
              Cancellation fees may apply to cover administrative, procurement,
              or production costs already incurred.
            </p>
          </section>

          <section className="mb-8">
            <h3 className="text-xl font-semibold text-[var(--shreeji-primary)] mb-3">
              10. Limitation of Liability
            </h3>
            <p className="text-gray-700 mb-3">
              To the fullest extent permitted by applicable law:
            </p>
            <ul className="list-disc pl-6 space-y-1 text-gray-700">
              <li>
                SHREEJI Investments Limited shall not be liable for indirect,
                incidental, or consequential losses
              </li>
              <li>
                Liability is limited to the value of the purchased product or
                service
              </li>
              <li>
                SHREEJI does not guarantee uninterrupted service availability or
                third-party performance
              </li>
            </ul>
          </section>

          <section className="mb-8">
            <h3 className="text-xl font-semibold text-[var(--shreeji-primary)] mb-3">
              11. Fraud Prevention & Compliance
            </h3>
            <p className="text-gray-700 mb-3">
              SHREEJI Investments Limited reserves the right to:
            </p>
            <ul className="list-disc pl-6 space-y-1 text-gray-700">
              <li>Decline suspicious transactions or refund claims</li>
              <li>Report fraudulent activity to relevant authorities</li>
              <li>Suspend accounts associated with abuse of refund policies</li>
            </ul>
          </section>

          <section className="mb-8">
            <h3 className="text-xl font-semibold text-[var(--shreeji-primary)] mb-3">
              12. Policy Amendments
            </h3>
            <p className="text-gray-700">
              This policy may be amended without prior notice. The version
              published on SHREEJI Investments Limited&apos;s official website
              at the time of purchase shall apply.
            </p>
          </section>

          <section className="mb-8">
            <h3 className="text-xl font-semibold text-[var(--shreeji-primary)] mb-3">
              13. Governing Law
            </h3>
            <p className="text-gray-700">
              This policy shall be governed by and interpreted in accordance
              with the laws of the Republic of Zambia, unless otherwise
              contractually agreed.
            </p>
          </section>

          <section id="shipping" className="mb-8 scroll-mt-24">
            <h3 className="text-xl font-semibold text-[var(--shreeji-primary)] mb-3">
              Shipping/Delivery Policy
            </h3>
            <p className="text-lg text-gray-600 mb-10">
              SHREEJI Investments Limited
            </p>

            <section className="mb-8">
              <h4 className="text-lg font-medium text-[var(--shreeji-primary)] mb-3">
                1. Policy Scope
              </h4>
              <p className="text-gray-700 mb-3">
                This Shipping &amp; Delivery Policy governs the delivery of
                goods and related services for all purchases made through
                SHREEJI Investments Limited&apos;s website, digital platforms,
                physical locations, and authorised sales channels. It applies to
                physical products, including IT equipment and related hardware,
                printed and branded goods, and any other items supplied by
                SHREEJI. By placing an order, the customer agrees to this
                policy.
              </p>
            </section>

            <section className="mb-8">
              <h4 className="text-lg font-medium text-[var(--shreeji-primary)] mb-3">
                2. Delivery Methods and Areas
              </h4>
              <p className="text-gray-700 mb-3">
                SHREEJI delivers within the Republic of Zambia unless otherwise
                agreed. Delivery may be by courier, third-party logistics
                partner, or customer collection from SHREEJI&apos;s premises
                (e.g. Shreeji House, Plot No. 1209, Addis Ababa Drive). Delivery
                method and availability depend on product type, location, and
                order value. International or out-of-area delivery may be
                available by separate agreement; contact{" "}
                <a
                  href="mailto:sales@shreeji.co.zm"
                  className="text-[var(--shreeji-primary)] hover:underline"
                >
                  sales@shreeji.co.zm
                </a>{" "}
                for details.
              </p>
            </section>

            <section className="mb-8">
              <h4 className="text-lg font-medium text-[var(--shreeji-primary)] mb-3">
                3. Delivery Timelines
              </h4>
              <p className="text-gray-700 mb-3">
                Estimated delivery times are given in business days from the
                date of order confirmation or dispatch and are indicative only.
                Standard delivery is typically within 5–15 business days for
                in-stock items, depending on destination and carrier.
                Customised, printed, or made-to-order items may require
                additional production time before dispatch; you will be informed
                of any extended timeline where possible. SHREEJI does not
                guarantee delivery by a specific date and is not liable for
                delays caused by carriers, customs, weather, or other events
                outside its control.
              </p>
            </section>

            <section className="mb-8">
              <h4 className="text-lg font-medium text-[var(--shreeji-primary)] mb-3">
                4. Shipping and Delivery Costs
              </h4>
              <p className="text-gray-700 mb-3">
                Unless otherwise stated (e.g. promotional free delivery), the
                customer is responsible for shipping and delivery costs. Costs
                may be shown at checkout or communicated before order
                confirmation. Charges may depend on weight, dimensions,
                destination, and delivery speed. Any free-delivery threshold or
                offer applies only as stated and may exclude certain products
                or areas.
              </p>
            </section>

            <section className="mb-8">
              <h4 className="text-lg font-medium text-[var(--shreeji-primary)] mb-3">
                5. Order Processing and Dispatch
              </h4>
              <p className="text-gray-700 mb-3">
                Orders are processed subject to stock availability and payment
                confirmation. Dispatch occurs after production (where
                applicable) and quality checks. You may receive an order or
                dispatch confirmation by email or other agreed channel. If an
                item is unavailable or delayed, SHREEJI will endeavour to notify
                you and offer a revised timeline, substitute (where
                appropriate), or refund in line with the Refund, Returns &amp;
                Cancellation Policy.
              </p>
            </section>

            <section className="mb-8">
              <h4 className="text-lg font-medium text-[var(--shreeji-primary)] mb-3">
                6. Tracking and Notifications
              </h4>
              <p className="text-gray-700 mb-3">
                Where available, tracking information will be provided by email
                or through the platform used for the order. It is the
                customer&apos;s responsibility to ensure contact details are
                correct and to check for updates. Lack of tracking for a
                particular service does not affect the applicability of this
                policy.
              </p>
            </section>

            <section className="mb-8">
              <h4 className="text-lg font-medium text-[var(--shreeji-primary)] mb-3">
                7. Risk and Title
              </h4>
              <p className="text-gray-700 mb-3">
                Risk of loss or damage to goods passes to the customer upon
                delivery to the address specified on the order (or to the
                carrier for collection by the customer, if applicable). Title
                in the goods passes at the same time, unless otherwise agreed
                in writing.
              </p>
            </section>

            <section className="mb-8">
              <h4 className="text-lg font-medium text-[var(--shreeji-primary)] mb-3">
                8. Delivery Address and Failed Delivery
              </h4>
              <p className="text-gray-700 mb-3">
                The customer must provide an accurate, complete delivery
                address and ensure someone is available to receive the order
                where required. If delivery fails due to incorrect address,
                absence of the recipient, or refusal, SHREEJI or its carrier
                may attempt re-delivery or hold the goods for collection;
                additional charges may apply. Unclaimed goods may be returned
                or disposed of after a reasonable period, in line with the
                Refund policy where relevant.
              </p>
            </section>

            <section className="mb-8">
              <h4 className="text-lg font-medium text-[var(--shreeji-primary)] mb-3">
                9. Collection from SHREEJI
              </h4>
              <p className="text-gray-700 mb-3">
                Where collection from SHREEJI&apos;s premises is chosen or
                offered, the customer must collect within the period
                communicated. Identification and proof of order may be
                required. Risk and title pass when goods are handed over to
                the customer at SHREEJI&apos;s premises.
              </p>
            </section>

            <section className="mb-8">
              <h4 className="text-lg font-medium text-[var(--shreeji-primary)] mb-3">
                10. Limitation of Liability
              </h4>
              <p className="text-gray-700 mb-3">
                To the fullest extent permitted by applicable law, SHREEJI
                Investments Limited shall not be liable for indirect,
                incidental, or consequential losses arising from delivery
                (including delay, loss, or damage in transit). Liability in
                respect of physical delivery is limited to the value of the
                affected goods or the cost of re-delivery, as determined by
                SHREEJI. SHREEJI does not guarantee carrier performance or
                uninterrupted delivery and is not responsible for delays or
                failures caused by third parties, force majeure, or events
                outside its reasonable control.
              </p>
            </section>

            <section className="mb-8">
              <h4 className="text-lg font-medium text-[var(--shreeji-primary)] mb-3">
                11. Policy Amendments
              </h4>
              <p className="text-gray-700 mb-3">
                This policy may be amended without prior notice. The version
                published on SHREEJI Investments Limited&apos;s official
                website at the time of the relevant order shall apply.
              </p>
            </section>

            <section className="mb-8">
              <h4 className="text-lg font-medium text-[var(--shreeji-primary)] mb-3">
                12. Governing Law
              </h4>
              <p className="text-gray-700">
                This policy shall be governed by and interpreted in accordance
                with the laws of the Republic of Zambia, unless otherwise
                contractually agreed.
              </p>
            </section>
          </section>
        </article>
        </main>
      </div>
    </div>
  );
}
