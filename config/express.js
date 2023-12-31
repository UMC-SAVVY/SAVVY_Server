import express from 'express';
import compression from 'compression';
import methodOverride from 'method-override';
import cors from 'cors';
import userRouter from '../src/app/User/userRoute';

const app = express();

// app.use(미들웨어) -> 미들웨어를 사용하기 위한 메서드

// 미들웨어들을 통하여 서버-클라이언트 간의 통신을 처리
app.use(compression()); // 압축을 사용하여 응답 데이터의 용량을 줄임 -> 클라이언트-서버 간의 데이터 전송 속도를 향상시키고 대역폭을 절약
app.use(express.json()); // json 파일 바디를 파싱 -> 클라이언트가 json으로 데이터를 보낼 때 해당 데이터를 쉽게 읽고 사용
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride()); // 웹브라우저가 지원하지 않는 PUT/DELETE 처리를 수행하기 위함
app.use(cors()); // 보안상의 이유로 API 요청을 차단하는 것을 해결

app.use('/src/app/User', userRouter);

export default app;
