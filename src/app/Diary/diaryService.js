import baseResponse from '../../../config/baseResponseStatus';
import pool from '../../../config/database';
import { response, errResponse } from '../../../config/response';
import {
    userIdCheck,
    diaryIdCheck,
    diaryOwnerMatchCheck
} from "./diaryProvider";
import {
    insertDiary,
    insertContent,
    insertThumbnail,
    insertImgCount,
    insertHashtag,
    updateDefault,
    deleteContent,
    deleteDiarybyId,
    deleteHashtag,
    checkLikeCount,
    upLikeCount,
    downLikeCount,
    deleteLikeLog,
    insertLikeLog,
    updatePublicIsTrue,
    updatePublicIsFalse
} from "./diaryDao";


export const deleteDiaryCheck = async (user_id, diary_id) => {
    // user가 존재하는지 체크
    const userExist = await userIdCheck(defaultInfo.user_id);
    if (!userExist[0][0]) {
        return errResponse(baseResponse.USER_USERID_NOT_EXIST);
    }
    const diaryExist = await diaryIdCheck(diary_id);
    // diary가 존재하는지 체크
    if (!myDiaryCheck[0][0]) {
        return errResponse(baseResponse.DAIRY_DIARYID_NOT_EXIST);
    }
    // 다이어리 작성자 user_id와 삭제를 시도하는 user_id가 같은지 체크
    if(user_id != diaryExist[0][0].user_id) {
        return errResponse(baseResponse.USER_USERID_NOT_MATCH_DIARYOWNER);
    }
    const connection = await pool.getConnection(async (conn) => conn);
    const deleteDiarybyIdResult = await deleteDiarybyId(connection, diary_id);

    connection.release();
    return response(baseResponse.SUCCESS);
};

export const createDiary = async (defaultInfo, contentInfo, hashtagInfo) => {
    // user가 존재하는지 체크
    const userExist = await userIdCheck(defaultInfo.user_id);
    if (!userExist[0][0]) {
        return errResponse(baseResponse.USER_USERID_NOT_EXIST);
    }
    const connection = await pool.getConnection(async (conn) => conn);
    const diaryId = await insertDiary(connection, [
        defaultInfo.title,
        defaultInfo.user_id,
        defaultInfo.planner_id,
        defaultInfo.is_public,
        defaultInfo.is_temporary
    ]);
    // diary 생성중 에러 검증
    if (!diaryId[0].insertId) {
        return errResponse(baseResponse.DAIRY_DIARYID_NOT_EXIST);
    }
    //내용 저장(이미지, 글, 장소).
    //이들은 모두 type 으로 구분한다.

    //type의 경우 이미지 = image, 글 = text
    //이미지에는 location 정보가 있고, 글에는 null
    for (let i = 0; i < contentInfo.length; i++) {
        const contentId = await insertContent(connection, [
            diaryId[0].insertId,
            contentInfo[i].count,
            contentInfo[i].type,
            contentInfo[i].content,
            contentInfo[i].location
        ]);
    }

    // type이 image인지를 0부터 시작하면서 확인
    for(let p = 0; p < contentInfo.length; p++) {
        if(contentInfo[p].type == 'image') {
            await insertThumbnail(connection, [
                contentInfo[p].content,
                diaryId[0].insertId
            ]);
            break;
        }
    }

    await insertImgCount(connection, [
        diaryId[0].insertId,
        diaryId[0].insertId
    ]);

    //해시태그 저장
    for (let j = 0; j < hashtagInfo.length; j++) {
        await insertHashtag(connection, [
            diaryId[0].insertId,
            hashtagInfo[j].tag
        ]);
    }

    connection.release();
    return response(baseResponse.SUCCESS);
}

export const modifyDiary = async(diary_id, modifydefaultInfo, modifycontentInfo, modifyhashtagInfo) => {
    // diary가 존재하는지 체크
    const diaryExist = await diaryIdCheck(diary_id);
    if (!diaryExist[0][0]) {
        return errResponse(baseResponse.DAIRY_DIARYID_NOT_EXIST);
    }
    const connection = await pool.getConnection(async (conn) => conn);
    // 기본 정보 수정
    await updateDefault(connection, [
        modifydefaultInfo.title,
        diary_id
    ]);
    // 내용 정보 수정을 위한 기존 내용 삭제
    await deleteContent(connection, diary_id);

    // 내용 정보 수정(하지만 처음 내용을 쓰는 것과 같다.)
    for (let i = 0; i < modifycontentInfo.length; i++) {
        await insertContent(connection, [
            diary_id,
            modifycontentInfo[i].count,
            modifycontentInfo[i].type,
            modifycontentInfo[i].content,
            modifycontentInfo[i].location,
        ]);
    }

// 변경된 썸네일과 이미지 개수 데이터 수정
// type이 image인지를 0부터 시작하면서 확인
    for(let p = 0; p < modifycontentInfo.length; p++) {
        if(modifycontentInfo[p].type == 'image') {
            await insertThumbnail(connection, [
                modifycontentInfo[p].content,
                diary_id
            ]);
            break;
        }
    }

    await insertImgCount(connection, [
        diary_id,
        diary_id
    ]);


    // 해시태그 정보 수정을 위한 기존 내용 삭제
    await deleteHashtag(connection, diary_id);

    // 해시태그 내용 수정(하지만 처음 내용을 쓰는 것과 같다.)
    for(let j = 0; j < modifyhashtagInfo.length; j++) {
        await insertHashtag(connection, [
            diary_id,
            modifyhashtagInfo[j].tag
        ]);
    }

    connection.release();
    return response(baseResponse.SUCCESS);
}

export const updateLikeCount = async(user_id, diary_id, value) => {
    // user가 존재하는지 체크
    const userExist = await userIdCheck(user_id);
    if (!userExist[0][0]) {
        return errResponse(baseResponse.USER_USERID_NOT_EXIST);
    }
    // diary가 존재하는지 체크
    const diaryExist = await diaryIdCheck(diary_id);
    if (!diaryExist[0][0]) {
        return errResponse(baseResponse.DAIRY_DIARYID_NOT_EXIST);
    }
    //좋아요 수가 음수인지 확인
    const likeNum = await checkLikeCount(connection, diary_id);
    if(likeNum[0][0].likes_count < 0) return errResponse(baseResponse.DAIRY_DIARY_LIKE_COUNT_IS_INVALID);
    
    const connection = await pool.getConnection(async (conn) => conn);

    if(value === 'up') {
        await upLikeCount(connection, diary_id); 
        await insertLikeLog(connection, [
            user_id,
            diary_id
        ]);
    } else if (value === 'down') {
        await downLikeCount(connection, diary_id);
        await deleteLikeLog(connection, [
            user_id,
            diary_id
        ]);
    } else {
        return response(errResponse(baseResponse.DAIRY_STATUS_VALUE_IS_INVALID));
        }
    
    connection.release();
    return response(baseResponse.SUCCESS);
}
export const updatedPublicStatus = async(user_id, diary_id, value) => {
    // user가 존재하는지 체크
    const userExist = await userIdCheck(user_id);
    if (!userExist[0][0]) {
        return errResponse(baseResponse.USER_USERID_NOT_EXIST);
    }
    // diary가 존재하는지 체크
    const diaryExist = await diaryIdCheck(diary_id);
    if (!diaryExist[0][0]) {
        return errResponse(baseResponse.DAIRY_DIARYID_NOT_EXIST);
    }
    // 다이어리 작성자 user_id와 공개 여부를 바꾸려는 user_id가 같은지 체크
    if(user_id != diaryExist[0][0].user_id) {
        return errResponse(baseResponse.USER_USERID_NOT_MATCH_DIARYOWNER);
    }
    const connection = await pool.getConnection(async (conn) => conn);

    if(value === 'true') {
        await updatePublicIsTrue(connection, diary_id);
    } else if (value === 'false') {
        await updatePublicIsFalse(connection, diary_id);
    } else {
        return errResponse(baseResponse.DAIRY_STATUS_VALUE_IS_INVALID);
    }
    connection.release();
    return response(baseResponse.SUCCESS);
}