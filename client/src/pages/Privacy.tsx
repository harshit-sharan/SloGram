import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield } from "lucide-react";

export default function Privacy() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex items-center gap-3 mb-6">
          <Shield className="w-8 h-8 text-primary" data-testid="icon-privacy" />
          <h1 className="text-4xl font-serif text-foreground" data-testid="text-privacy-title">
            Privacy Policy
          </h1>
        </div>

        <p className="text-muted-foreground mb-8" data-testid="text-last-updated">
          Last updated: October 27, 2025
        </p>

        <div className="space-y-6">
          <Card data-testid="card-introduction">
            <CardHeader>
              <CardTitle>Introduction</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-foreground/90">
              <p>
                Welcome to Slogram. We are committed to protecting your privacy and ensuring you have a 
                peaceful, mindful experience on our platform. This Privacy Policy explains how we collect, 
                use, and protect your personal information.
              </p>
            </CardContent>
          </Card>

          <Card data-testid="card-information-collection">
            <CardHeader>
              <CardTitle>Information We Collect</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-foreground/90">
              <div>
                <h3 className="font-semibold mb-2">Account Information</h3>
                <p>
                  When you create an account, we collect your email address, username, display name, 
                  and password (encrypted). You may optionally provide additional profile information 
                  such as a bio, profile picture, and website.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Content You Share</h3>
                <p>
                  We store the moments (posts), reflections (comments), and direct messages you create 
                  on Slogram. This includes photos, videos, captions, and any text content you share.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Usage Information</h3>
                <p>
                  We collect information about how you interact with the platform, including moments you 
                  savor (like), keep (save), and users you follow. This helps us personalize your experience 
                  and show you relevant content.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-information-use">
            <CardHeader>
              <CardTitle>How We Use Your Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-foreground/90">
              <ul className="list-disc list-inside space-y-2">
                <li>To provide and maintain our service</li>
                <li>To personalize your feed and discover relevant content</li>
                <li>To enable communication between users through direct messages</li>
                <li>To notify you of interactions (savors, reflects, new followers)</li>
                <li>To moderate content and maintain a peaceful community environment</li>
                <li>To improve and develop new features for the platform</li>
                <li>To respond to support requests and communicate with you</li>
              </ul>
            </CardContent>
          </Card>

          <Card data-testid="card-ai-moderation">
            <CardHeader>
              <CardTitle>AI-Powered Content Moderation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-foreground/90">
              <p>
                Slogram uses AI technology to analyze content you post (both text and images) to ensure 
                it aligns with our mindfulness and peaceful community values. This automated moderation 
                helps maintain a serene environment by detecting content that may be urgent, aggressive, 
                or inconsistent with slow living principles.
              </p>
              <p>
                Content that doesn't meet our community standards may be blocked from being posted. 
                This process is automated and designed to protect the contemplative nature of our platform.
              </p>
            </CardContent>
          </Card>

          <Card data-testid="card-data-security">
            <CardHeader>
              <CardTitle>Data Security</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-foreground/90">
              <p>
                We take the security of your data seriously and implement appropriate technical and 
                organizational measures to protect it:
              </p>
              <ul className="list-disc list-inside space-y-2">
                <li>Passwords are encrypted using industry-standard hashing algorithms</li>
                <li>Direct messages are encrypted end-to-end</li>
                <li>Secure session management with HTTP-only cookies</li>
                <li>Regular security updates and monitoring</li>
                <li>Access controls to limit who can view your content based on your privacy settings</li>
              </ul>
            </CardContent>
          </Card>

          <Card data-testid="card-data-sharing">
            <CardHeader>
              <CardTitle>Information Sharing and Disclosure</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-foreground/90">
              <p>
                We do not sell your personal information to third parties. We may share your information only in 
                the following circumstances:
              </p>
              <ul className="list-disc list-inside space-y-2">
                <li><strong>With other users:</strong> Your profile information, moments, and reflects are visible 
                to other users according to your privacy settings</li>
                <li><strong>Service providers:</strong> We may share data with trusted service providers who help 
                us operate the platform (hosting, storage, AI moderation)</li>
                <li><strong>Legal requirements:</strong> We may disclose information if required by law or to 
                protect our rights and users' safety</li>
              </ul>
            </CardContent>
          </Card>

          <Card data-testid="card-your-rights">
            <CardHeader>
              <CardTitle>Your Rights and Choices</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-foreground/90">
              <p>You have control over your information and can:</p>
              <ul className="list-disc list-inside space-y-2">
                <li>Access and update your profile information at any time</li>
                <li>Delete your moments and reflects</li>
                <li>Control who can see your content through privacy settings</li>
                <li>Request a copy of your data</li>
                <li>Request deletion of your account and associated data</li>
                <li>Opt out of certain communications</li>
              </ul>
              <p className="mt-4">
                To exercise these rights, please contact us through our support page.
              </p>
            </CardContent>
          </Card>

          <Card data-testid="card-data-retention">
            <CardHeader>
              <CardTitle>Data Retention</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-foreground/90">
              <p>
                We retain your information for as long as your account is active or as needed to provide 
                you services. If you delete your account, we will delete your personal information, though 
                some information may be retained for legal compliance, dispute resolution, and enforcement 
                of our agreements.
              </p>
            </CardContent>
          </Card>

          <Card data-testid="card-children-privacy">
            <CardHeader>
              <CardTitle>Children's Privacy</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-foreground/90">
              <p>
                Slogram is not intended for children under the age of 13. We do not knowingly collect 
                personal information from children under 13. If you believe we have collected information 
                from a child under 13, please contact us immediately.
              </p>
            </CardContent>
          </Card>

          <Card data-testid="card-policy-changes">
            <CardHeader>
              <CardTitle>Changes to This Policy</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-foreground/90">
              <p>
                We may update this Privacy Policy from time to time. We will notify you of any changes 
                by posting the new Privacy Policy on this page and updating the "Last updated" date. 
                We encourage you to review this Privacy Policy periodically for any changes.
              </p>
            </CardContent>
          </Card>

          <Card data-testid="card-contact">
            <CardHeader>
              <CardTitle>Contact Us</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-foreground/90">
              <p>
                If you have any questions about this Privacy Policy or our privacy practices, please 
                contact us through our support page. We're here to help and ensure your experience 
                on Slogram remains peaceful and secure.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
