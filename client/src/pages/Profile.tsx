import { Settings, Grid3x3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import avatar1 from "@assets/generated_images/Peaceful_woman_profile_photo_8348405c.png";
import post1 from "@assets/generated_images/Morning_coffee_slow_living_2c7c7488.png";
import post2 from "@assets/generated_images/Cozy_reading_corner_moment_85d546e5.png";
import post3 from "@assets/generated_images/Bread_making_slow_living_949d5b0e.png";
import post4 from "@assets/generated_images/Sunset_nature_walk_c18a36cc.png";

const mockUserPosts = [post1, post3, post2, post4, post1, post3];

export default function Profile() {
  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row gap-8 md:gap-12 items-center md:items-start mb-8">
          <Avatar className="h-32 w-32" data-testid="img-avatar-profile">
            <AvatarImage src={avatar1} />
            <AvatarFallback>EC</AvatarFallback>
          </Avatar>

          <div className="flex-1 text-center md:text-left">
            <div className="flex flex-col md:flex-row items-center gap-4 mb-4">
              <h1 className="font-serif text-2xl" data-testid="text-username">
                emma_mindful
              </h1>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" data-testid="button-edit-profile">
                  Edit Profile
                </Button>
                <Button variant="ghost" size="icon" data-testid="button-settings">
                  <Settings className="h-5 w-5" />
                </Button>
              </div>
            </div>

            <div className="flex gap-8 justify-center md:justify-start mb-4">
              <div data-testid="text-posts-count">
                <span className="font-semibold">12</span> posts
              </div>
              <div data-testid="text-followers-count">
                <span className="font-semibold">2,453</span> followers
              </div>
              <div data-testid="text-following-count">
                <span className="font-semibold">384</span> following
              </div>
            </div>

            <div>
              <p className="font-semibold mb-1" data-testid="text-display-name">
                Emma Chen
              </p>
              <p className="text-muted-foreground max-w-md" data-testid="text-bio">
                Living slowly, loving deeply 🌿<br />
                Finding beauty in everyday moments<br />
                Mindful living & slow living advocate
              </p>
            </div>
          </div>
        </div>

        <div className="border-t">
          <div className="flex items-center justify-center gap-2 py-3 text-sm font-semibold">
            <Grid3x3 className="h-4 w-4" />
            POSTS
          </div>

          <div className="grid grid-cols-3 gap-1">
            {mockUserPosts.map((post, index) => (
              <button
                key={index}
                className="aspect-square hover-elevate overflow-hidden"
                onClick={() => console.log(`View post ${index + 1}`)}
                data-testid={`button-post-${index}`}
              >
                <img
                  src={post}
                  alt={`Post ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
