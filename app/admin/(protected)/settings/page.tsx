import { getSiteConfig } from "@/lib/data/siteConfig";
import { updateSiteConfig } from "@/app/admin/actions/siteConfig";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function SettingsPage() {
  const config = await getSiteConfig();

  return (
    <div className="max-w-2xl">
      <h1 className="mb-6 text-2xl font-bold text-gold">사이트 설정</h1>

      <form action={updateSiteConfig} className="flex flex-col gap-6">
        {/* 가입신청 */}
        <Card>
          <CardHeader>
            <CardTitle>가입신청</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <div className="flex items-center gap-2">
              <Checkbox id="signup_visible" name="signup_visible" defaultChecked={config.signup_visible} />
              <Label htmlFor="signup_visible">가입신청 노출</Label>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="signup_link">가입신청 링크</Label>
              <Input id="signup_link" name="signup_link" type="url" defaultValue={config.signup_link ?? ""} />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="signup_new_tab" name="signup_new_tab" defaultChecked={config.signup_new_tab} />
              <Label htmlFor="signup_new_tab">새 탭에서 열기</Label>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="signup_button_label">버튼 레이블</Label>
              <Input id="signup_button_label" name="signup_button_label" defaultValue={config.signup_button_label ?? ""} />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="signup_closed" name="signup_closed" defaultChecked={config.signup_closed} />
              <Label htmlFor="signup_closed">가입 마감</Label>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="signup_closed_text">마감 안내 텍스트</Label>
              <Input id="signup_closed_text" name="signup_closed_text" defaultValue={config.signup_closed_text ?? ""} />
            </div>
          </CardContent>
        </Card>

        {/* 리더보드 */}
        <Card>
          <CardHeader>
            <CardTitle>리더보드</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <div className="flex items-center gap-2">
              <Checkbox id="leaderboard_tab_visible" name="leaderboard_tab_visible" defaultChecked={config.leaderboard_tab_visible} />
              <Label htmlFor="leaderboard_tab_visible">리더보드 탭 노출</Label>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="leaderboard_api_url">리더보드 API URL</Label>
              <Input id="leaderboard_api_url" name="leaderboard_api_url" type="url" defaultValue={config.leaderboard_api_url ?? ""} />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="leaderboard_personal_rank_visible" name="leaderboard_personal_rank_visible" defaultChecked={config.leaderboard_personal_rank_visible} />
              <Label htmlFor="leaderboard_personal_rank_visible">개인 랭킹 노출</Label>
            </div>
          </CardContent>
        </Card>

        {/* 푸터 스폰서 */}
        <Card>
          <CardHeader>
            <CardTitle>푸터 스폰서</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-2">
              <Label htmlFor="footer_sponsors">
                스폰서 목록 (JSON 배열, 예: [{`{"name":"","logo":""}`}])
              </Label>
              <Textarea
                id="footer_sponsors"
                name="footer_sponsors"
                rows={4}
                defaultValue={JSON.stringify(config.footer_sponsors)}
              />
            </div>
          </CardContent>
        </Card>

        <div>
          <Button type="submit">저장</Button>
        </div>
      </form>
    </div>
  );
}
