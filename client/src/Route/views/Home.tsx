import { useState } from "react";

export default function Home() {
  const [Info, setInfo] = useState({
    commentCount: 0,
    likeCount: 0,
    meetingCount: 0,
    noteCount: 0,
    time: new Date(),
    watchedCount: 0,
  });

  return (
    <div></div>
    // <div className="p-2 space-y-4 max-w-[80%] mx-auto">
    //   <h2 className="py-4">欢迎回来</h2>
    //   <h2>
    //     {dayjs().format("M月D日")}
    //     <span className="opacity-80 text-[15px]">{dayjs().format("ddd")}</span>
    //   </h2>
    //   <h3 className="opacity-60">
    //     上一次更新时间:<span>{dayjs(Info.time).format("M月D日H时mm分")}</span>
    //   </h3>

    //   {/* <TodoList /> */}
    //   {/* <TalksManage /> */}
    //   {/* <NoteList /> */}
    //   <div className="flex flex-wrap gap-4">
    //     <div className="p-2 border rounded-md border-black-500/30  w-[300px] flex ">
    //       <section className="space-y-2 flex-1 ">
    //         <h5>{"文章"}</h5>
    //         <h5>{Info.noteCount}</h5>
    //       </section>
    //       <div className="w-[50px] h-full opacity-70 flex items-center justify-center pr-2">
    //         {/* <MdOutlineArticle className="size-8" /> */}
    //       </div>
    //     </div>
    //     <div className="p-2 border rounded-md border-black-500/30  w-[300px] flex ">
    //       <section className="space-y-2 flex-1 ">
    //         <h5>{"会议"}</h5>
    //         <h5>{Info.meetingCount}</h5>
    //         <footer className="flex gap-2">
    //           <AddMeeting>
    //             <Button type="primary">新增</Button>
    //           </AddMeeting>
    //           <Meetingmanage>
    //             <Button>管理</Button>
    //           </Meetingmanage>
    //         </footer>
    //       </section>
    //       <div className="w-[50px] h-full opacity-70  flex items-center justify-center pr-2">
    //         {/* <BsPencil className="size-8" /> */}
    //       </div>
    //     </div>
    //     <div className="p-2 border rounded-md border-black-500/30  w-[300px] flex">
    //       <section className="space-y-2 flex-1">
    //         <div className="space-y-2">
    //           <h5>{"评论"}</h5>
    //           <h5>{Info.commentCount}</h5>
    //         </div>
    //         <footer className="flex gap-2">
    //           <CommentManage>
    //             <Button>管理</Button>
    //           </CommentManage>
    //         </footer>
    //       </section>
    //       <div className="w-[50px] h-full opacity-70 flex items-center justify-center pr-2">
    //         {/* <AiOutlineComment className="size-8" /> */}
    //       </div>
    //     </div>
    //     <div className="p-2 border rounded-md border-black-500/30  w-[300px] flex ">
    //       <section className="space-y-2 flex-1 ">
    //         <div className="space-y-2 pb-2">
    //           <h5>{"在线访客"}</h5>
    //           <h5>0</h5>
    //         </div>
    //       </section>
    //       <div className="w-[50px] h-full flex opacity-70 items-center justify-center pr-2">
    //         {/* <CgUserList className="size-8" /> */}
    //       </div>
    //     </div>
    //     <div className="p-2 border rounded-md border-black-500/30  w-[300px] flex ">
    //       <section className="space-y-2 flex-1 ">
    //         <div className="space-y-2 pb-2">
    //           <h5>{"总点赞数"}</h5>
    //           <h5>{Info.likeCount}</h5>
    //         </div>
    //       </section>
    //       <div className="w-[50px] h-full flex opacity-70 items-center justify-center pr-2">
    //         {/* <AiOutlineLike className="size-8" /> */}
    //       </div>
    //     </div>
    //     <div className="p-2 border rounded-md border-black-500/30  w-[300px] flex ">
    //       <section className="space-y-2 flex-1 ">
    //         <div className="space-y-2 pb-2">
    //           <h5>{"总阅读量"}</h5>
    //           <h5>{Info.watchedCount}</h5>
    //         </div>
    //       </section>
    //       <div className="w-[50px] h-full flex opacity-70 items-center justify-center pr-2">
    //         {/* <AiOutlineEye className="size-8" /> */}
    //       </div>
    //     </div>
    //   </div>

    //   <MeetingList />
    // </div>
  );
}
