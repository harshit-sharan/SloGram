import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "wouter";

interface KeptMoment {
  id: string;
  userId: string;
  type: "image" | "video";
  mediaUrl: string;
  caption: string | null;
  createdAt: string;
  savedAt: string;
}

export default function Kept() {
  const { user } = useAuth();

  const { data: keptMoments = [], isLoading } = useQuery<KeptMoment[]>({
    queryKey: ["/api/keeps"],
    enabled: !!user,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pb-20 md:pb-0">
        <div className="max-w-5xl mx-auto px-4 py-8">
          <h1 className="font-serif text-2xl mb-6" data-testid="text-page-title">Kept Moments</h1>
          <p className="text-center text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <h1 className="font-serif text-2xl mb-6" data-testid="text-page-title">Kept Moments</h1>

        {keptMoments.length === 0 ? (
          <div className="text-center py-12" data-testid="empty-kept">
            <p className="text-muted-foreground">No kept moments yet</p>
            <p className="text-sm text-muted-foreground mt-2">
              Moments you keep will appear here
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-1" data-testid="kept-moments-grid">
            {keptMoments.map((moment) => (
              <Link
                key={moment.id}
                href={`/moment/${moment.id}`}
                data-testid={`link-kept-moment-${moment.id}`}
              >
                <div className="relative aspect-square bg-muted cursor-pointer hover-elevate overflow-hidden">
                  {moment.type === "video" ? (
                    <video
                      src={moment.mediaUrl}
                      className="w-full h-full object-cover"
                      data-testid={`video-kept-${moment.id}`}
                      muted
                      loop
                      playsInline
                      onMouseEnter={(e) => e.currentTarget.play()}
                      onMouseLeave={(e) => e.currentTarget.pause()}
                    />
                  ) : (
                    <img
                      src={moment.mediaUrl}
                      alt="Kept moment"
                      className="w-full h-full object-cover"
                      data-testid={`img-kept-${moment.id}`}
                    />
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
