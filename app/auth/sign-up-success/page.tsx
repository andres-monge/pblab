import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function Page() {
  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">
            Magic link sent!
          </CardTitle>
          <CardDescription>Check your email to sign in</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            We&apos;ve sent you a magic link! Click the link in your email to
            complete your sign-up and sign in to your account.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
