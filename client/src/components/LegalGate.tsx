import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Shield, FileText, Check, Loader2 } from "lucide-react";
import { authApi } from "@/lib/api";
import { toast } from "sonner";

interface LegalGateProps {
  children: React.ReactNode;
}

export function LegalGate({ children }: LegalGateProps) {
  const [legalStatus, setLegalStatus] = useState<{
    ipDisclosureAccepted: Date | null;
    userAgreementAccepted: Date | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showIpModal, setShowIpModal] = useState(false);
  const [showAgreementModal, setShowAgreementModal] = useState(false);
  const [ipChecked, setIpChecked] = useState(false);
  const [agreementChecked, setAgreementChecked] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    checkLegalStatus();
  }, []);

  const checkLegalStatus = async () => {
    setLoading(true);
    setError(null);
    try {
      const status = await authApi.getLegalStatus();
      setLegalStatus(status);
      
      if (!status.ipDisclosureAccepted) {
        setShowIpModal(true);
      } else if (!status.userAgreementAccepted) {
        setShowAgreementModal(true);
      }
    } catch (err) {
      console.error("Failed to check legal status:", err);
      setError("Unable to verify legal status. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptIpDisclosure = async () => {
    if (!ipChecked) {
      toast.error("Please check the box to confirm you have read and agree");
      return;
    }
    
    setSubmitting(true);
    try {
      const status = await authApi.acceptIpDisclosure();
      setLegalStatus(status);
      setShowIpModal(false);
      
      if (!status.userAgreementAccepted) {
        setShowAgreementModal(true);
      }
      toast.success("IP Disclosure accepted");
    } catch (error) {
      toast.error("Failed to accept IP Disclosure");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAcceptUserAgreement = async () => {
    if (!agreementChecked) {
      toast.error("Please check the box to confirm you have read and agree");
      return;
    }
    
    setSubmitting(true);
    try {
      const status = await authApi.acceptUserAgreement();
      setLegalStatus(status);
      setShowAgreementModal(false);
      toast.success("User Agreement accepted - Welcome to Press Start CoMixx!");
    } catch (error) {
      toast.error("Failed to accept User Agreement");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-white mx-auto mb-4" />
          <p className="text-white font-mono">Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen bg-black flex items-center justify-center">
        <div className="text-center max-w-md p-8 border-4 border-white">
          <Shield className="w-16 h-16 text-red-500 mx-auto mb-6" />
          <h1 className="text-2xl font-black text-white mb-4 font-display tracking-tight">
            CONNECTION ERROR
          </h1>
          <p className="text-gray-400 font-mono text-sm mb-6">
            {error}
          </p>
          <Button 
            onClick={checkLegalStatus}
            className="bg-white text-black hover:bg-gray-200 font-bold px-6 py-3 border-4 border-black"
            data-testid="retry-legal-status"
          >
            <Loader2 className="w-4 h-4 mr-2" />
            RETRY
          </Button>
        </div>
      </div>
    );
  }

  const needsLegalAcceptance = !legalStatus?.ipDisclosureAccepted || !legalStatus?.userAgreementAccepted;

  if (needsLegalAcceptance) {
    return (
      <>
        <div className="h-screen bg-black flex items-center justify-center">
          <div className="text-center max-w-md p-8 border-4 border-white">
            <Shield className="w-16 h-16 text-white mx-auto mb-6" />
            <h1 className="text-2xl font-black text-white mb-4 font-display tracking-tight">
              LEGAL AGREEMENTS REQUIRED
            </h1>
            <p className="text-gray-400 font-mono text-sm mb-6">
              Before accessing Press Start CoMixx creator tools, you must review and accept our legal agreements.
            </p>
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 border border-gray-700 bg-gray-900">
                {legalStatus?.ipDisclosureAccepted ? (
                  <Check className="w-5 h-5 text-green-500" />
                ) : (
                  <div className="w-5 h-5 border border-gray-600 rounded" />
                )}
                <span className="text-white font-mono text-sm">NDA & IP Disclosure</span>
              </div>
              <div className="flex items-center gap-3 p-3 border border-gray-700 bg-gray-900">
                {legalStatus?.userAgreementAccepted ? (
                  <Check className="w-5 h-5 text-green-500" />
                ) : (
                  <div className="w-5 h-5 border border-gray-600 rounded" />
                )}
                <span className="text-white font-mono text-sm">User Agreement</span>
              </div>
            </div>
          </div>
        </div>

        <Dialog open={showIpModal} onOpenChange={() => {}}>
          <DialogContent className="bg-black border-4 border-white max-w-2xl max-h-[90vh] p-0" data-testid="ip-disclosure-modal">
            <DialogHeader className="p-6 border-b-4 border-white">
              <div className="flex items-center gap-3">
                <Shield className="w-8 h-8 text-white" />
                <div>
                  <DialogTitle className="text-xl font-black text-white font-display tracking-tight">
                    NDA & INTELLECTUAL PROPERTY DISCLOSURE
                  </DialogTitle>
                  <DialogDescription className="text-gray-400 font-mono text-xs mt-1">
                    Please read carefully before proceeding
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>
            
            <ScrollArea className="h-[400px] p-6">
              <div className="space-y-6 text-white font-mono text-sm">
                <section>
                  <h3 className="text-lg font-bold mb-3 border-b border-gray-700 pb-2">1. NON-DISCLOSURE AGREEMENT</h3>
                  <p className="text-gray-300 leading-relaxed">
                    By accessing and using the Press Start CoMixx platform ("Platform"), you agree to maintain the confidentiality of all proprietary information, trade secrets, and non-public features of the Platform. This includes, but is not limited to:
                  </p>
                  <ul className="list-disc list-inside mt-3 space-y-2 text-gray-400">
                    <li>Platform architecture and technical implementations</li>
                    <li>Unreleased features and roadmap information</li>
                    <li>Internal documentation and communications</li>
                    <li>Beta testing materials and feedback systems</li>
                  </ul>
                </section>

                <section>
                  <h3 className="text-lg font-bold mb-3 border-b border-gray-700 pb-2">2. INTELLECTUAL PROPERTY OWNERSHIP</h3>
                  <p className="text-gray-300 leading-relaxed">
                    <strong className="text-white">Your Content:</strong> You retain full ownership of all original content you create using the Platform, including but not limited to comics, illustrations, stories, characters, and designs.
                  </p>
                  <p className="text-gray-300 leading-relaxed mt-3">
                    <strong className="text-white">AI-Generated Content:</strong> Content generated using our AI tools may be subject to additional licensing terms. You are responsible for ensuring you have appropriate rights to use AI-generated content in your projects.
                  </p>
                  <p className="text-gray-300 leading-relaxed mt-3">
                    <strong className="text-white">Platform IP:</strong> Press Start CoMixx retains all rights to the Platform, including its software, design, branding, and proprietary technologies.
                  </p>
                </section>

                <section>
                  <h3 className="text-lg font-bold mb-3 border-b border-gray-700 pb-2">3. LICENSE GRANT</h3>
                  <p className="text-gray-300 leading-relaxed">
                    By uploading content to the Platform, you grant Press Start CoMixx a non-exclusive, worldwide, royalty-free license to:
                  </p>
                  <ul className="list-disc list-inside mt-3 space-y-2 text-gray-400">
                    <li>Display and render your content within the Platform</li>
                    <li>Create thumbnails and previews for your projects</li>
                    <li>Include your public projects in platform showcases (with attribution)</li>
                    <li>Process and store your content on our servers</li>
                  </ul>
                  <p className="text-gray-300 leading-relaxed mt-3">
                    This license does not transfer ownership and terminates when you delete your content from the Platform.
                  </p>
                </section>

                <section>
                  <h3 className="text-lg font-bold mb-3 border-b border-gray-700 pb-2">4. THIRD-PARTY CONTENT</h3>
                  <p className="text-gray-300 leading-relaxed">
                    You warrant that any content you upload or create does not infringe upon the intellectual property rights of third parties. You are solely responsible for obtaining necessary permissions or licenses for any third-party content used in your projects.
                  </p>
                </section>

                <section>
                  <h3 className="text-lg font-bold mb-3 border-b border-gray-700 pb-2">5. CONFIDENTIALITY OBLIGATIONS</h3>
                  <p className="text-gray-300 leading-relaxed">
                    You agree not to disclose, publish, or disseminate any confidential information relating to the Platform or its users without prior written consent. This obligation survives termination of your account.
                  </p>
                </section>
              </div>
            </ScrollArea>

            <DialogFooter className="p-6 border-t-4 border-white bg-gray-950">
              <div className="w-full space-y-4">
                <div className="flex items-start gap-3 p-4 bg-gray-900 border border-gray-700">
                  <Checkbox 
                    id="ip-agree" 
                    checked={ipChecked}
                    onCheckedChange={(checked) => setIpChecked(checked === true)}
                    className="mt-1 border-white data-[state=checked]:bg-white data-[state=checked]:text-black"
                    data-testid="ip-disclosure-checkbox"
                  />
                  <label htmlFor="ip-agree" className="text-sm text-gray-300 font-mono leading-relaxed cursor-pointer">
                    I have read and understand the NDA and Intellectual Property Disclosure. I agree to be bound by these terms and acknowledge that violation may result in legal action.
                  </label>
                </div>
                <Button 
                  onClick={handleAcceptIpDisclosure}
                  disabled={!ipChecked || submitting}
                  className="w-full bg-white text-black hover:bg-gray-200 font-bold py-3 border-4 border-black disabled:opacity-50"
                  data-testid="ip-disclosure-accept-button"
                >
                  {submitting ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Shield className="w-4 h-4 mr-2" />
                  )}
                  ACCEPT & CONTINUE
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showAgreementModal} onOpenChange={() => {}}>
          <DialogContent className="bg-black border-4 border-white max-w-2xl max-h-[90vh] p-0" data-testid="user-agreement-modal">
            <DialogHeader className="p-6 border-b-4 border-white">
              <div className="flex items-center gap-3">
                <FileText className="w-8 h-8 text-white" />
                <div>
                  <DialogTitle className="text-xl font-black text-white font-display tracking-tight">
                    USER AGREEMENT & TERMS OF SERVICE
                  </DialogTitle>
                  <DialogDescription className="text-gray-400 font-mono text-xs mt-1">
                    Please read carefully before proceeding
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>
            
            <ScrollArea className="h-[400px] p-6">
              <div className="space-y-6 text-white font-mono text-sm">
                <section>
                  <h3 className="text-lg font-bold mb-3 border-b border-gray-700 pb-2">1. ACCEPTANCE OF TERMS</h3>
                  <p className="text-gray-300 leading-relaxed">
                    By accessing or using Press Start CoMixx ("Service"), you agree to be bound by these Terms of Service. If you do not agree to all terms, you may not access or use the Service.
                  </p>
                </section>

                <section>
                  <h3 className="text-lg font-bold mb-3 border-b border-gray-700 pb-2">2. ACCOUNT REGISTRATION</h3>
                  <p className="text-gray-300 leading-relaxed">
                    You must provide accurate, current, and complete information during registration. You are responsible for maintaining the confidentiality of your account credentials and for all activities under your account.
                  </p>
                  <ul className="list-disc list-inside mt-3 space-y-2 text-gray-400">
                    <li>You must be at least 18 years old to use this Service</li>
                    <li>One person may not maintain more than one account</li>
                    <li>You may not use another person's account without permission</li>
                  </ul>
                </section>

                <section>
                  <h3 className="text-lg font-bold mb-3 border-b border-gray-700 pb-2">3. ACCEPTABLE USE POLICY</h3>
                  <p className="text-gray-300 leading-relaxed">
                    You agree not to use the Service to:
                  </p>
                  <ul className="list-disc list-inside mt-3 space-y-2 text-gray-400">
                    <li>Create, upload, or distribute illegal, harmful, or offensive content</li>
                    <li>Infringe upon intellectual property rights of others</li>
                    <li>Harass, abuse, or harm other users</li>
                    <li>Attempt to gain unauthorized access to the Service or its systems</li>
                    <li>Use automated tools to scrape or extract data without permission</li>
                    <li>Interfere with the proper functioning of the Service</li>
                  </ul>
                </section>

                <section>
                  <h3 className="text-lg font-bold mb-3 border-b border-gray-700 pb-2">4. CONTENT GUIDELINES</h3>
                  <p className="text-gray-300 leading-relaxed">
                    While we support creative expression, the following content is prohibited:
                  </p>
                  <ul className="list-disc list-inside mt-3 space-y-2 text-gray-400">
                    <li>Content depicting minors in inappropriate situations</li>
                    <li>Non-consensual or exploitative content</li>
                    <li>Content promoting violence, terrorism, or hate speech</li>
                    <li>Misleading or fraudulent content</li>
                  </ul>
                </section>

                <section>
                  <h3 className="text-lg font-bold mb-3 border-b border-gray-700 pb-2">5. SERVICE MODIFICATIONS</h3>
                  <p className="text-gray-300 leading-relaxed">
                    We reserve the right to modify, suspend, or discontinue any part of the Service at any time. We will provide reasonable notice when possible for significant changes.
                  </p>
                </section>

                <section>
                  <h3 className="text-lg font-bold mb-3 border-b border-gray-700 pb-2">6. TERMINATION</h3>
                  <p className="text-gray-300 leading-relaxed">
                    We may terminate or suspend your account at any time for violations of these terms. Upon termination, your right to use the Service ceases immediately. You may download your content before account termination.
                  </p>
                </section>

                <section>
                  <h3 className="text-lg font-bold mb-3 border-b border-gray-700 pb-2">7. LIMITATION OF LIABILITY</h3>
                  <p className="text-gray-300 leading-relaxed">
                    THE SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND. WE SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING FROM YOUR USE OF THE SERVICE.
                  </p>
                </section>

                <section>
                  <h3 className="text-lg font-bold mb-3 border-b border-gray-700 pb-2">8. GOVERNING LAW</h3>
                  <p className="text-gray-300 leading-relaxed">
                    These Terms shall be governed by and construed in accordance with applicable laws, without regard to conflict of law principles.
                  </p>
                </section>

                <section>
                  <h3 className="text-lg font-bold mb-3 border-b border-gray-700 pb-2">9. CONTACT</h3>
                  <p className="text-gray-300 leading-relaxed">
                    For questions about these Terms, please contact us at legal@pressstart.space
                  </p>
                </section>
              </div>
            </ScrollArea>

            <DialogFooter className="p-6 border-t-4 border-white bg-gray-950">
              <div className="w-full space-y-4">
                <div className="flex items-start gap-3 p-4 bg-gray-900 border border-gray-700">
                  <Checkbox 
                    id="agreement-agree" 
                    checked={agreementChecked}
                    onCheckedChange={(checked) => setAgreementChecked(checked === true)}
                    className="mt-1 border-white data-[state=checked]:bg-white data-[state=checked]:text-black"
                    data-testid="user-agreement-checkbox"
                  />
                  <label htmlFor="agreement-agree" className="text-sm text-gray-300 font-mono leading-relaxed cursor-pointer">
                    I have read and agree to the User Agreement and Terms of Service. I understand that violation of these terms may result in account termination.
                  </label>
                </div>
                <Button 
                  onClick={handleAcceptUserAgreement}
                  disabled={!agreementChecked || submitting}
                  className="w-full bg-white text-black hover:bg-gray-200 font-bold py-3 border-4 border-black disabled:opacity-50"
                  data-testid="user-agreement-accept-button"
                >
                  {submitting ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <FileText className="w-4 h-4 mr-2" />
                  )}
                  ACCEPT & ENTER CREATOR STUDIO
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return <>{children}</>;
}
