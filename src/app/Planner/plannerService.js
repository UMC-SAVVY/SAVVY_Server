import baseResponse from '../../../config/baseResponseStatus';
import pool from '../../../config/database';
import { response, errResponse } from '../../../config/response';
import {
  plannerIdCheck,
  scrapIdCheck,
  userIdCheck,
  retrievePlannerId,
  retrieveTimetableId,
} from './plannerProvider';
import {
  deletePlannerbyId,
  deleteScrapbyId,
  insertPlanner,
  insertTimetable,
  insertChecklist,
} from './plannerDao';

export const deletePlannerCheck = async (user_id, planner_id, type) => {
  // 삭제하려는 유저가 여행계획서 소유자인지 판별
  // 본인꺼 삭제하는지, 스크랩한거 삭제하는지
  // type === 0 : 나의 계획서 / 1 : 스크랩
  // user가 존재하는지 체크
  const plannerOwner = await userIdCheck(user_id);
  if (!plannerOwner[0][0]) {
    return errResponse(baseResponse.USER_USERID_NOT_EXIST);
  }
  if (type === '0') {
    const myPlannerCheck = await plannerIdCheck(planner_id);
    // planner가 존재하는지 체크
    if (!myPlannerCheck[0][0]) {
      return errResponse(baseResponse.PLANNER_PLANNERID_NOT_EXIST);
    }
    const connection = await pool.getConnection(async (conn) => conn);
    const deletePlannerbyIdResult = deletePlannerbyId(connection, planner_id);

    connection.release();
    return response(baseResponse.SUCCESS, deletePlannerbyIdResult[0]);
  } else {
    const myScrapCheck = await scrapIdCheck(user_id, planner_id);
    // planner가 존재하는지 체크
    if (!myScrapCheck[0][0]) {
      return errResponse(baseResponse.PLANNER_SCRAP_NOT_EXIST);
    }
    const connection = await pool.getConnection(async (conn) => conn);
    const deleteScrapbyIdResult = deleteScrapbyId(connection, [
      user_id,
      planner_id,
    ]);

    connection.release();
    return response(baseResponse.SUCCESS, deleteScrapbyIdResult[0]);
  }
};

export const createPlanner = async (defaultInfo, timetableInfo) => {
  // user가 존재하는지 체크
  const userExist = await userIdCheck(defaultInfo.user_id);
  if (!userExist[0][0]) {
    return errResponse(baseResponse.USER_USERID_NOT_EXIST);
  }
  const connection = await pool.getConnection(async (conn) => conn);
  const plannerId = await insertPlanner(connection, [
    defaultInfo.title,
    defaultInfo.user_id,
    defaultInfo.memo,
  ]);

  // planner 생성중 에러 검증
  if (!plannerId[0].insertId) {
    return errResponse(baseResponse.PLANNER_PLANNERID_NOT_EXIST);
  }
  // 시간표 저장
  for (let i = 0; i < timetableInfo.length; i++) {
    for (let j = 0; j < timetableInfo[i].schedule.length; j++) {
      const timetableId = await insertTimetable(connection, [
        plannerId[0].insertId,
        timetableInfo[i].schedule[j].place_name,
        timetableInfo[i].date,
        timetableInfo[i].schedule[j].started_at,
        timetableInfo[i].schedule[j].finished_at,
      ]);

      // 체크리스트 저장
      if (!timetableInfo[i].schedule[j].checklist) continue;
      for (let k = 0; k < timetableInfo[i].schedule[j].checklist.length; k++) {
        await insertChecklist(connection, [
          timetableId[0].insertId,
          timetableInfo[i].schedule[j].checklist[k].contents,
          timetableInfo[i].schedule[j].checklist[k].is_checked,
        ]);
      }
    }
  }
  connection.release();
  return response(baseResponse.SUCCESS);
};