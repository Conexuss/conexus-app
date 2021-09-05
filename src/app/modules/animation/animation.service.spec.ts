import {TestBed} from '@angular/core/testing';
import {AnimationService} from './animation.service';
import {Pose} from '../pose/pose.state';
import {TensorflowService} from '../../core/services/tfjs.service';

describe('AnimationService', () => {
  let service: AnimationService;

  beforeEach(() => {
    TestBed.configureTestingModule({providers: [TensorflowService]});
    service = TestBed.inject(AnimationService);
  });

  it('should create', () => {
    expect(service).toBeTruthy();
  });

  it('model weights should not contain NaN', async () => {
    await service.loadModel();
    const model = service.sequentialModel;

    expect(model).toBeTruthy();

    const weights = await Promise.all(model.getWeights().map(w => w.data()));
    for (const weight of weights) {
      const isNaN = Boolean(service.tf.isNaN(weight).any().dataSync()[0]);
      expect(isNaN).toBeFalse();
    }
  });

  it('should normalize pose correctly', async () => {
    await service.tf.load();

    // eslint-disable-next-line max-len
    const body = [[676.8400573730469, 240.16031742095947, -540.0334548950195], [682.1658325195312, 223.71554374694824, -525.9656524658203], [687.2616577148438, 223.36093425750732, -525.9656524658203], [692.3738098144531, 222.93643712997437, -525.9656524658203], [667.7975463867188, 223.37286472320557, -533.43017578125], [661.9689178466797, 222.45009899139404, -533.43017578125], [656.1238861083984, 221.5971565246582, -533.1430816650391], [695.2497100830078, 221.98820114135742, -393.03871154785156], [644.6881103515625, 219.43493127822876, -428.3518981933594], [683.9999389648438, 248.61910343170166, -484.9104309082031], [664.4527435302734, 247.72697925567627, -494.95887756347656], [717.9374694824219, 271.1633062362671, -255.8053207397461], [601.184196472168, 261.65897369384766, -327.2930145263672], [717.7736663818359, 351.1815404891968, -172.11591720581055], [555.81787109375, 338.9046835899353, -369.49657440185547], [738.1588745117188, 415.2242374420166, -226.0905647277832], [621.104850769043, 369.23327922821045, -496.3943862915039], [747.6786804199219, 432.4920415878296, -239.5842170715332], [642.2528839111328, 384.06426429748535, -539.4593048095703], [751.4612579345703, 433.96764278411865, -278.3426284790039], [649.1701507568359, 364.6012544631958, -547.7851486206055], [741.4280700683594, 428.96405696868896, -242.3116683959961], [644.2013549804688, 360.636305809021, -500.1266860961914], [674.4903564453125, 400.01808643341064, 16.929876804351807], [610.632209777832, 400.10061264038086, -16.90295934677124], [708.8606262207031, 491.2203598022461, -195.08386611938477], [603.49609375, 509.8893928527832, -72.95907020568848], [706.6419219970703, 571.1996269226074, 47.62256622314453], [606.1350250244141, 542.0583057403564, 307.19608306884766], [695.0957489013672, 581.4697408676147, 65.88925361633301], [612.5643157958984, 543.5640335083008, 341.0737609863281], [737.5331115722656, 620.6005096435547, -45.82819938659668], [590.2180862426758, 586.0990619659424, 272.74417877197266]];
    // eslint-disable-next-line max-len
    const leftHand = [[740.3588104248047, 423.6501932144165, -0.020384432282298803], [752.2219848632812, 432.51654624938965, -7.094274163246155], [762.0954132080078, 440.0114965438843, -16.4169180393219], [771.3340759277344, 444.6203899383545, -23.907763957977295], [780.7820129394531, 448.7684154510498, -30.56769847869873], [756.9470977783203, 438.94861221313477, -37.24021673202515], [752.6459503173828, 447.7811050415039, -49.90541458129883], [750.5397033691406, 443.85220527648926, -50.937767028808594], [750.106201171875, 439.6561574935913, -50.96294403076172], [749.1436004638672, 433.4051513671875, -40.28691291809082], [744.0623474121094, 441.52679443359375, -53.329806327819824], [742.4721527099609, 438.63614559173584, -48.74716758728027], [741.5879058837891, 435.4571485519409, -46.38031005859375], [740.7406616210938, 427.73521900177, -43.50986957550049], [736.4926147460938, 435.0416851043701, -55.09235858917236], [735.947265625, 433.4618854522705, -49.25075054168701], [736.4560699462891, 430.4270839691162, -46.1536979675293], [732.8805541992188, 422.57237434387207, -47.739996910095215], [729.2029571533203, 428.6088466644287, -57.81172275543213], [730.1058197021484, 428.4297180175781, -57.40885257720947], [731.3063812255859, 426.19065284729004, -58.26495170593262]];
    // eslint-disable-next-line max-len
    const rightHand = [[625.7101440429688, 367.53679275512695, -0.02058903221040964], [639.0488815307617, 360.98052978515625, 5.838416218757629], [650.8924865722656, 362.5005912780762, 9.575886726379395], [657.9426574707031, 367.2590446472168, 14.655014276504517], [659.9776458740234, 371.33278369903564, 19.254977703094482], [653.4370422363281, 380.85054874420166, -1.4126092195510864], [664.7904205322266, 387.5492477416992, 5.532488822937012], [670.7441711425781, 388.96562576293945, 11.44093632698059], [674.5212554931641, 389.7140693664551, 15.893466472625732], [648.0884552001953, 387.6565361022949, 1.2900540232658386], [657.2798156738281, 387.95445442199707, 14.935139417648315], [657.2106170654297, 382.81495571136475, 23.029305934906006], [655.1145935058594, 380.5839157104492, 26.066462993621826], [642.2812652587891, 391.1071014404297, 5.650436878204346], [650.1192474365234, 390.46212673187256, 19.240235090255737], [650.5638885498047, 385.0449228286743, 25.211341381072998], [648.4510803222656, 382.26194858551025, 25.771594047546387], [636.6188049316406, 393.2145023345947, 10.33517599105835], [642.9705810546875, 392.0298671722412, 21.510729789733887], [642.8957366943359, 387.43492126464844, 26.302361488342285], [641.2538909912109, 384.9562168121338, 27.6440167427063]];

    const component = (c) => c.map(v => ({x: v[0] / 1280, y: v[1] / 720, z: v[2] / 1280}));

    const pose = {
      poseLandmarks: component(body),
      leftHandLandmarks: component(leftHand),
      rightHandLandmarks: component(rightHand),
      image: {
        width: 1280,
        height: 720
      }
    } as Pose;

    // eslint-disable-next-line max-len
    const y = [[0.12591414153575897, -0.19129018485546112, -1.810709834098816], [0.16472294926643372, -0.3111236095428467, -1.7081973552703857], [0.201856330037117, -0.31370770931243896, -1.7081973552703857], [0.23910847306251526, -0.3168010413646698, -1.7081973552703857], [0.06002096086740494, -0.31362074613571167, -1.7625916004180908], [0.017547735944390297, -0.3203449249267578, -1.7625916004180908], [-0.025045130401849747, -0.326560378074646, -1.7604994773864746], [0.26006531715393066, -0.32371076941490173, -0.739556074142456], [-0.10837797075510025, -0.34231650829315186, -0.9968841075897217], [0.17808812856674194, -0.12965083122253418, -1.4090272188186646], [0.035647425800561905, -0.13615183532238007, -1.482250452041626], [0.42539182305336, 0.03462913632392883, 0.2604662775993347], [-0.42539182305336, -0.03462913632392883, -0.260466068983078], [0.42419806122779846, 0.6177237629890442, 0.8703126907348633], [-0.755977213382721, 0.5282620787620544, -0.5680041909217834], [0.5727453827857971, 1.0844041109085083, 0.47699838876724243], [-0.2802295982837677, 0.749267041683197, -1.492711067199707], [0.6421166062355042, 1.2102348804473877, 0.3786698877811432], [-0.12612362205982208, 0.8573408126831055, -1.8065259456634521], [0.6696799993515015, 1.2209877967834473, 0.09623657166957855], [-0.07571714371442795, 0.7155134677886963, -1.8671966791152954], [0.5965682864189148, 1.1845264434814453, 0.35879480838775635], [-0.11192496865987778, 0.6866206526756287, -1.5199084281921387], [0.10879160463809967, 0.9735966920852661, 2.2478933334350586], [-0.3565440773963928, 0.9741979837417603, 2.0013527870178223], [0.35924825072288513, 1.638189435005188, 0.702944815158844], [-0.40854504704475403, 1.7742310762405396, 1.5928705930709839], [0.34308061003685, 2.2210001945495605, 2.4715514183044434], [-0.3893151879310608, 2.0086464881896973, 4.363068580627441], [0.2589436173439026, 2.2958383560180664, 2.604661226272583], [-0.3424645960330963, 2.0196187496185303, 4.609936237335205], [0.5681852102279663, 2.5809853076934814, 1.7905738353729248], [-0.5053021907806396, 2.3295724391937256, 4.1120171546936035], [0.5887764692306519, 1.1458042860031128, 2.1243762969970703], [0.6752235889434814, 1.2104134559631348, 2.072828769683838], [0.7471713423728943, 1.2650294303894043, 2.004894495010376], [0.8144939541816711, 1.298614501953125, 1.9503084421157837], [0.8833408355712891, 1.3288410902023315, 1.9017775058746338], [0.7096554636955261, 1.2572840452194214, 1.8531546592712402], [0.6783128976821899, 1.3216465711593628, 1.760863184928894], [0.6629645228385925, 1.2930166721343994, 1.7533403635025024], [0.6598058342933655, 1.2624400854110718, 1.7531569004058838], [0.652791440486908, 1.2168887853622437, 1.8309533596038818], [0.615764319896698, 1.2760714292526245, 1.7359095811843872], [0.6041764616966248, 1.2550071477890015, 1.769303321838379], [0.5977327227592468, 1.231841802597046, 1.7865506410598755], [0.5915589332580566, 1.1755720376968384, 1.8074675798416138], [0.5606033205986023, 1.2288142442703247, 1.723065733909607], [0.5566293597221375, 1.2173022031784058, 1.7656337022781372], [0.5603368878364563, 1.1951876878738403, 1.788201928138733], [0.5342821478843689, 1.1379503011703491, 1.7766426801681519], [0.5074833035469055, 1.1819381713867188, 1.7032496929168701], [0.5140627026557922, 1.1806327104568481, 1.7061854600906372], [0.522811233997345, 1.1643165349960327, 1.6999469995498657], [-0.24667079746723175, 0.7369047999382019, 2.1243748664855957], [-0.14947108924388885, 0.689129114151001, 2.167069435119629], [-0.0631667748093605, 0.7002057433128357, 2.1943047046661377], [-0.01179203949868679, 0.7348806858062744, 2.231316328048706], [0.003037296235561371, 0.7645663022994995, 2.264836311340332], [-0.04462454840540886, 0.8339223861694336, 2.1142313480377197], [0.03810786083340645, 0.8827359676361084, 2.1648404598236084], [0.0814928486943245, 0.8930571675300598, 2.207895278930664], [0.10901665687561035, 0.8985111117362976, 2.2403409481048584], [-0.08359970152378082, 0.8835176229476929, 2.133925437927246], [-0.016622180119156837, 0.8856887817382812, 2.2333576679229736], [-0.01712609827518463, 0.8482369184494019, 2.29233980178833], [-0.03239975497126579, 0.8319794535636902, 2.31447172164917], [-0.12591680884361267, 0.9086621999740601, 2.1656999588012695], [-0.06880105286836624, 0.9039621353149414, 2.2647287845611572], [-0.06556094437837601, 0.864486813545227, 2.3082404136657715], [-0.08095735311508179, 0.8442073464393616, 2.3123230934143066], [-0.1671793907880783, 0.9240188002586365, 2.1998374462127686], [-0.12089364230632782, 0.9153863191604614, 2.2812740802764893], [-0.12143892049789429, 0.8819029331207275, 2.316190719604492], [-0.13340309262275696, 0.8638404011726379, 2.325967311859131]];

    const yHat = service.normalizePose(pose).arraySync();
    for (let i = 0; i < y.length; i++) {
      for (let j = 0; j < 3; j++) {
        const yRound = Number(y[i][j].toFixed(2));
        const yHatRound = Number(yHat[i][j].toFixed(2));
        if (yRound !== 0 || yHatRound !== 0) { // Don't evaluate case of 0 vs -0
          expect(yHatRound).toEqual(yRound);
        }
      }
    }
  });
});

