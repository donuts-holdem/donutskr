import { fireEvent,render,screen,waitFor,within } from "@testing-library/react";
import { expect,it,vi } from "vitest";
import { ConfirmedAction } from "@/components/membership/ConfirmedAction";
it("submits only after confirmation and retains error feedback for retry",async()=>{
 const action=vi.fn().mockResolvedValueOnce({error:"잠시 후 다시 시도해 주세요."}).mockResolvedValue({success:"신청했습니다."});
 render(<ConfirmedAction action={action} label="참가 신청" title="참가 신청" description="만석이면 대기자로 등록됩니다." fields={{id:"meeting-id"}}/>);
 fireEvent.click(screen.getByRole("button",{name:"참가 신청"}));expect(action).not.toHaveBeenCalled();
 const dialog=screen.getByRole("alertdialog");fireEvent.click(within(dialog).getByRole("button",{name:"확인"}));
 await screen.findByRole("alert");expect(action.mock.calls[0][1].get("id")).toBe("meeting-id");
 fireEvent.click(within(dialog).getByRole("button",{name:"확인"}));
 await waitFor(()=>expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());expect(screen.getByRole("status")).toHaveTextContent("신청했습니다.");
});
