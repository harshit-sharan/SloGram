import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, AlertTriangle } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function Terms() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex items-center gap-3 mb-6">
          <FileText className="w-8 h-8 text-primary" data-testid="icon-terms" />
          <h1 className="text-4xl font-serif text-foreground" data-testid="text-terms-title">
            Terms of Service
          </h1>
        </div>

        <p className="text-muted-foreground mb-8" data-testid="text-last-updated">
          Last updated: October 27, 2025
        </p>

        <div className="space-y-6">
          <Card data-testid="card-acceptance">
            <CardHeader>
              <CardTitle>Acceptance of Terms</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-foreground/90">
              <p>
                By creating an account on Slogram, accessing, or using our platform, you agree to be bound 
                by these Terms of Service and our Privacy Policy. If you do not agree to these terms, 
                you may not use the platform.
              </p>
              <p>
                These Terms constitute a legally binding agreement between you and Slogram governing your 
                access to and use of our mindfulness-focused social media platform.
              </p>
            </CardContent>
          </Card>

          <Card data-testid="card-platform-purpose" className="border-primary/20">
            <CardHeader>
              <CardTitle>Platform Purpose and Philosophy</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-foreground/90">
              <p>
                Slogram is designed as a mindfulness-focused social media platform promoting slow living, 
                intentional content sharing, and contemplative digital experiences. Our platform is built 
                on principles of:
              </p>
              <ul className="list-disc list-inside space-y-2">
                <li><strong>Peacefulness:</strong> Creating a calm, serene digital environment</li>
                <li><strong>Mindfulness:</strong> Encouraging thoughtful, intentional content</li>
                <li><strong>Harmony:</strong> Fostering respectful, supportive community interactions</li>
                <li><strong>Slow Living:</strong> Promoting presence over urgency</li>
              </ul>
              <p>
                By using Slogram, you commit to upholding these values in all your interactions on the platform.
              </p>
            </CardContent>
          </Card>

          <Card data-testid="card-zero-tolerance" className="border-destructive/50 bg-destructive/5">
            <CardHeader className="flex flex-row items-center gap-3">
              <AlertTriangle className="h-6 w-6 text-destructive" />
              <CardTitle className="text-destructive">Zero Tolerance Policy</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-foreground/90">
              <p className="font-semibold">
                Slogram maintains a strict zero tolerance policy for objectionable content and abusive behavior.
              </p>
              <p>
                The following content and behaviors are strictly prohibited and will result in immediate 
                account termination without warning:
              </p>
              <ul className="list-disc list-inside space-y-2">
                <li>Harassment, bullying, intimidation, or threatening behavior towards any user</li>
                <li>Hate speech, discrimination, or content targeting individuals based on race, ethnicity, 
                    religion, gender, sexual orientation, disability, or any protected characteristic</li>
                <li>Violence, gore, or content depicting or promoting harm to people or animals</li>
                <li>Sexually explicit or pornographic content</li>
                <li>Content promoting self-harm, suicide, or dangerous activities</li>
                <li>Spam, scams, phishing, or fraudulent content</li>
                <li>Doxxing or sharing others' private information without consent</li>
                <li>Impersonation of other individuals or entities</li>
                <li>Content that violates any applicable laws or regulations</li>
                <li>Any content that contradicts the peaceful, mindful nature of our community</li>
              </ul>
              <p className="font-semibold mt-4">
                Violations may be reported to appropriate authorities where required by law.
              </p>
            </CardContent>
          </Card>

          <Card data-testid="card-content-moderation">
            <CardHeader>
              <CardTitle>Content Moderation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-foreground/90">
              <p>
                To maintain the peaceful nature of our community, Slogram employs AI-powered content 
                moderation that automatically reviews all content before publication. This includes:
              </p>
              <ul className="list-disc list-inside space-y-2">
                <li>Text analysis to ensure captions and comments align with community values</li>
                <li>Visual content analysis to detect inappropriate or aggressive imagery</li>
                <li>Pattern detection to identify potentially harmful behavior</li>
              </ul>
              <p>
                Content that does not meet our community standards will be automatically blocked from 
                publication. We reserve the right to remove any content and terminate any account at 
                our sole discretion without prior notice.
              </p>
            </CardContent>
          </Card>

          <Card data-testid="card-user-responsibilities">
            <CardHeader>
              <CardTitle>User Responsibilities</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-foreground/90">
              <p>As a Slogram user, you agree to:</p>
              <ul className="list-disc list-inside space-y-2">
                <li>Provide accurate information when creating your account</li>
                <li>Maintain the security and confidentiality of your account credentials</li>
                <li>Be solely responsible for all activity that occurs under your account</li>
                <li>Post only content that you own or have the right to share</li>
                <li>Respect the intellectual property rights of others</li>
                <li>Treat all community members with respect and kindness</li>
                <li>Report any violations of these terms that you observe</li>
                <li>Comply with all applicable local, state, national, and international laws</li>
              </ul>
            </CardContent>
          </Card>

          <Card data-testid="card-account-termination">
            <CardHeader>
              <CardTitle>Account Suspension and Termination</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-foreground/90">
              <p>
                We reserve the right to suspend or permanently terminate your account at any time, 
                with or without notice, for any reason, including but not limited to:
              </p>
              <ul className="list-disc list-inside space-y-2">
                <li>Violation of these Terms of Service</li>
                <li>Violation of our Zero Tolerance Policy</li>
                <li>Behavior that harms other users or the platform</li>
                <li>Creating multiple accounts to circumvent restrictions</li>
                <li>Any activity that we determine is harmful to the community</li>
              </ul>
              <p className="mt-4">
                Upon termination, your right to use the platform will immediately cease. We may delete 
                your content and data in accordance with our Privacy Policy.
              </p>
            </CardContent>
          </Card>

          <Card data-testid="card-intellectual-property">
            <CardHeader>
              <CardTitle>Intellectual Property</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-foreground/90">
              <p>
                You retain ownership of the content you post on Slogram. However, by posting content, 
                you grant us a non-exclusive, worldwide, royalty-free license to use, display, 
                reproduce, and distribute your content solely for the purpose of operating and 
                improving the platform.
              </p>
              <p>
                The Slogram name, logo, and all related marks are trademarks of Slogram. You may not 
                use these marks without our prior written permission.
              </p>
            </CardContent>
          </Card>

          <Card data-testid="card-disclaimers">
            <CardHeader>
              <CardTitle>Disclaimers and Limitations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-foreground/90">
              <p>
                THE PLATFORM IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED. 
                WE DO NOT GUARANTEE THAT THE PLATFORM WILL BE UNINTERRUPTED, SECURE, OR ERROR-FREE.
              </p>
              <p>
                TO THE MAXIMUM EXTENT PERMITTED BY LAW, SLOGRAM SHALL NOT BE LIABLE FOR ANY INDIRECT, 
                INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING FROM YOUR USE OF THE PLATFORM.
              </p>
            </CardContent>
          </Card>

          <Card data-testid="card-changes">
            <CardHeader>
              <CardTitle>Changes to Terms</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-foreground/90">
              <p>
                We may modify these Terms at any time. We will notify you of material changes by posting 
                the updated Terms on the platform and updating the "Last updated" date. Your continued 
                use of the platform after changes become effective constitutes acceptance of the revised Terms.
              </p>
            </CardContent>
          </Card>

          <Card data-testid="card-governing-law">
            <CardHeader>
              <CardTitle>Governing Law</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-foreground/90">
              <p>
                These Terms shall be governed by and construed in accordance with applicable laws. 
                Any disputes arising from these Terms or your use of the platform shall be resolved 
                through binding arbitration or in courts of competent jurisdiction.
              </p>
            </CardContent>
          </Card>

          <Card data-testid="card-contact">
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-foreground/90">
              <p>
                If you have questions about these Terms of Service, please contact us through our 
                support page. We are committed to maintaining a peaceful, mindful community and 
                welcome your feedback.
              </p>
              <div className="mt-4">
                <Link href="/support">
                  <Button variant="outline" data-testid="link-support">
                    Contact Support
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
