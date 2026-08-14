---
title: "sky-takeout-day04-note"
description: "Sky-takeout 苍穹外卖项目实战 Day04：套餐管理业务分析、多表关联操作与菜品套餐联动。"
pubDate: 2025-10-13
tags: ["Java", "项目学习"]
category: "Java"
draft: false
---

# Sky-takeout Day04

---

> 【前言】
>
> Day04 的 Task 是套餐管理相关代码的开发 ，也是对多表业务的分析能力的锻炼

## Contents

* 新增套餐
* 套餐分页查询
* 删除套餐
* 修改套餐
* 起售停售套餐

## 1. 新增套餐

### 需求分析与接口设计

业务规则：

* 套餐名称唯一
* 套餐必须属于某个分类
* 套餐必须包含菜品
* 名称、分类、价格、图片为必填项
* 添加菜品窗口需要根据分类类型来展示菜品
* 新增的套餐默认为停售状态

接口设计（共涉及到 4 个接口）：

* 根据类型查询分类（已完成）
* 根据分类 id 查询菜品
* 图片上传（已完成）
* 新增套餐

**产品原型：**  
![image-20251013090412130](/images/posts/image-20251013090412130.png)

![image-20251013090422861](/images/posts/image-20251013090422861.png)

可以看到，在新增套餐中还涉及到了菜品的一个接口，就是 **根据分类 id 查询菜品并列出菜品**，所以需要在 DishController 再加一个接口 来根据分类 id 展示菜品（list）

**接口设计：**  
![image-20251013090823018](/images/posts/image-20251013090823018.png)

---

![image-20251013090830998](/images/posts/image-20251013090830998.png)

**表设计：**

setmeal 表为套餐表，用于存储套餐的信息。具体表结构如下：

| 字段名 | 数据类型 | 说明 | 备注 |
| --- | --- | --- | --- |
| id | bigint | 主键 | 自增 |
| name | varchar(32) | 套餐名称 | 唯一 |
| category\_id | bigint | 分类 id | 逻辑外键 |
| price | decimal(10,2) | 套餐价格 |  |
| image | varchar(255) | 图片路径 |  |
| description | varchar(255) | 套餐描述 |  |
| status | int | 售卖状态 | 1 起售 0 停售 |
| create\_time | datetime | 创建时间 |  |
| update\_time | datetime | 最后修改时间 |  |
| create\_user | bigint | 创建人 id |  |
| update\_user | bigint | 最后修改人 id |  |

setmeal\_dish 表为套餐菜品关系表，用于存储套餐和菜品的关联关系。具体表结构如下：

| 字段名 | 数据类型 | 说明 | 备注 |
| --- | --- | --- | --- |
| id | bigint | 主键 | 自增 |
| setmeal\_id | bigint | 套餐 id | 逻辑外键 |
| dish\_id | bigint | 菜品 id | 逻辑外键 |
| name | varchar(32) | 菜品名称 | 冗余字段 |
| price | decimal(10,2) | 菜品单价 | 冗余字段 |
| copies | int | 菜品份数 |  |

### 流程分析

### 代码编写

#### 1）根据分类 id 查询并列出菜品

**DishController.java**

```
/** * 根据分类条件查询列出菜品 * @param categoryId 分类id * @return 菜品列表 */@GetMapping("/list")@ApiOperation("根据分类条件查询并列出菜品")public Result<List<Dish>> list(Long categoryId) {    log.info("根据分类条件查询并列出菜品: {}", categoryId);    List<Dish> dishList = dishService.list(categoryId);    return Result.success(dishList);}
```

**DishServiceImpl.java**

这里注意 status **状态是 ENABLE**，一开始写成 DISABLE 了，没有菜品列出，后面发现是状态设置错了。

```
/** * 根据分类条件查询列出菜品 * @param categoryId 分类id * @return 菜品列表 */@Overridepublic List<Dish> list(Long categoryId) {    Dish dish = Dish.builder()            .status(StatusConstant.ENABLE) // 注意这里是只查询起售状态的菜品            .categoryId(categoryId)            .build();    return dishMapper.list(dish);}
```

**DishMapper.java**

```
/** * 动态条件查询菜品 * @param dish 条件 * @return 菜品列表 */List<Dish> list(Dish dish);
```

**DishMapper.xml**

```
<select id="list" resultType="com.sky.entity.Dish">    select * from dish    <where>        <if test="name != null and name != ''">            and name like concat('%', #{name}, '%')        </if>        <if test="categoryId != null">            and category_id = #{categoryId}        </if>        <if test="status != null">            and status = #{status}        </if>    </where>    order by create_time desc</select>
```

#### 2）新增套餐

SetmealController.java

```
package com.sky.controller.admin;import com.sky.dto.SetmealDTO;import com.sky.result.Result;import com.sky.service.SetmealService;import io.swagger.annotations.Api;import io.swagger.annotations.ApiOperation;import lombok.extern.slf4j.Slf4j;import org.springframework.beans.factory.annotation.Autowired;import org.springframework.web.bind.annotation.PostMapping;import org.springframework.web.bind.annotation.RequestBody;import org.springframework.web.bind.annotation.RequestMapping;import org.springframework.web.bind.annotation.RestController;@RestController@Api(tags = "套餐管理")@RequestMapping("admin/setmeal")@Slf4jpublic class SetmealController {    @Autowired    private SetmealService setmealService;    /**     * 新增套餐     * @param setmealDTO 套餐信息     * @return 结果     */    @PostMapping    @ApiOperation("新增套餐")    public Result<Void> save(@RequestBody SetmealDTO setmealDTO) { // 这里要加 @RequestBody 将前端传递的json数据转换为java对象        log.info("新增套餐: {}", setmealDTO);        setmealService.saveWithDish(setmealDTO);        return Result.success();    }}
```

SetmealServiceImpl.java

```
package com.sky.service.impl;import com.sky.dto.SetmealDTO;import com.sky.entity.Setmeal;import com.sky.entity.SetmealDish;import com.sky.mapper.SetmealDishMapper;import com.sky.mapper.SetmealMapper;import com.sky.service.SetmealService;import org.springframework.beans.BeanUtils;import org.springframework.beans.factory.annotation.Autowired;import org.springframework.stereotype.Service;import java.util.List;@Servicepublic class SetmealServiceImpl implements SetmealService {    @Autowired    private SetmealMapper setmealMapper;    @Autowired    private SetmealDishMapper setmealDishMapper;    /**     * 新增套餐     * @param setmealDTO 套餐信息     */    @Override    public void saveWithDish(SetmealDTO setmealDTO) {        Setmeal setmeal = new Setmeal();        BeanUtils.copyProperties(setmealDTO, setmeal);        // 1. 向setmeal表插入套餐        setmealMapper.insert(setmeal);        // 2. 向setmeal_dish表插入套餐和菜品的关联关系        // 先获取套餐id        Long setmealId = setmeal.getId();        // 再获取套餐和菜品的关联关系        List<SetmealDish> setmealDishes = setmealDTO.getSetmealDishes();        // 设置套餐id        setmealDishes.forEach(setmealDish -> setmealDish.setSetmealId(setmealId));        // 批量插入套餐和菜品的关联关系        setmealDishMapper.insertBatch(setmealDishes);    }}
```

SetmealMapper.java

```
/** * 插入套餐, 并且将主键回填到实体类对象中 (useGeneratedKeys = true, keyProperty = "id") * @param setmeal 套餐 */@AutoFill(value = OperationType.INSERT)void insert(Setmeal setmeal);
```

SetmealMapper.xml

```
<?xml version="1.0" encoding="UTF-8" ?><!DOCTYPE mapper PUBLIC "-//mybatis.org//DTD Mapper 3.0//EN"        "http://mybatis.org/dtd/mybatis-3-mapper.dtd" ><mapper namespace="com.sky.mapper.SetmealMapper">    <insert id="insert" useGeneratedKeys="true" keyProperty="id">        insert into setmeal (category_id, name, price, description, image, create_time, update_time, create_user, update_user)        values        (#{categoryId}, #{name}, #{price}, #{description}, #{image}, #{createTime}, #{updateTime}, #{createUser}, #{updateUser})    </insert></mapper>
```

SetmealDishMapper.java

```
/** * 批量插入套餐和菜品的关联关系 * @param setmealDishes 套餐和菜品的关联关系 */void insertBatch(List<SetmealDish> setmealDishes);
```

SetmealDishMapper.xml

```
<insert id="insertBatch">    insert into setmeal_dish (setmeal_id, dish_id, name, price, copies)    values    <foreach collection="setmealDishes" item="sd" separator=",">        (#{sd.setmealId}, #{sd.dishId}, #{sd.name}, #{sd.price}, #{sd.copies})    </foreach></insert>
```

### 功能测试

![image-20251013112100927](/images/posts/image-20251013112100927.png)

![image-20251013112107482](/images/posts/image-20251013112107482.png)

成功在表中插入数据  
![image-20251013112114859](/images/posts/image-20251013112114859.png)

* **注意** 这里有误！！后来在写删除套餐的时候才发现，插入时 status 不应该是 1，之前编写新增套餐代码的时候在 mapper 的 xml 映射文件遗漏了 status 字段，而且在 service 层忘记设置了初始状态为停售 DISABLE（也就是 0）

## 2. 套餐分页查询

### 需求分析与接口设计

**业务规则：**

* 根据页码进行分页展示
* 每页展示 10 条数据
* 可以根据需要，按照套餐名称、分类、售卖状态进行查询

**产品原型**  
![image-20251013112348704](/images/posts/image-20251013112348704.png)

注意因为视图需要套餐对应的分类名称，所以分页时 **Page 的泛型是 VO 对象，即 SetmealVO。**

![image-20251013113648754](/images/posts/image-20251013113648754.png)

**接口设计：**  
![image-20251013112435652](/images/posts/image-20251013112435652.png)

### 流程分析

### 代码编写

**SetmealController.java**

```
/** * 分页查询套餐 * @param setmealPageQueryDTO 分页查询参数 * @return 套餐分页结果 */@GetMapping("/page")@ApiOperation("分页查询套餐")public Result<PageResult> page(SetmealPageQueryDTO setmealPageQueryDTO) {    log.info("分页查询套餐: {}", setmealPageQueryDTO);    PageResult pageResult = setmealService.pageQuery(setmealPageQueryDTO);    return Result.success(pageResult);}
```

**SetmealServiceImpl.java**

```
/** * 分页查询套餐 * @param setmealPageQueryDTO 分页查询参数 * @return 套餐分页结果 */@Overridepublic PageResult pageQuery(SetmealPageQueryDTO setmealPageQueryDTO) {    PageHelper.startPage(setmealPageQueryDTO.getPage(), setmealPageQueryDTO.getPageSize());    Page<SetmealVO> page = setmealMapper.pageQuery(setmealPageQueryDTO);    return new PageResult(page.getTotal(), page.getResult());}
```

**SetmealMapper.java**

```
/** * 分页查询套餐 * @param setmealPageQueryDTO 分页查询参数 * @return 套餐分页结果 */Page<SetmealVO> pageQuery(SetmealPageQueryDTO setmealPageQueryDTO);
```

**SetmealMapper.xml**

```
<select id="pageQuery" resultType="com.sky.vo.SetmealVO">    select s.*, c.name as categoryName    from setmeal s left outer join category c    on s.category_id = c.id    <where>        <if test="name != null">            s.name like concat('%', #{name}, '%')        </if>        <if test="status != null">            and s.status = #{status}        </if>        <if test="categoryId != null">            and s.category_id = #{categoryId}        </if>    </where></select>
```

### 功能测试

![image-20251013114913208](/images/posts/image-20251013114913208.png)

![image-20251013114722042](/images/posts/image-20251013114722042.png)

## 3. 删除套餐

### 需求分析与接口设计

**业务规则：**

* 可以一次删除一个套餐，也可以批量删除套餐
* 起售中的套餐不能删除

**接口设计：**

![image-20251013115744668](/images/posts/image-20251013115744668.png)

### 流程分析

### 代码编写

**SetmealController.java**

```
/** * 删除套餐 * @param ids 套餐id集合 * @return 结果 */@DeleteMapping@ApiOperation("删除套餐")public Result<Void> delete(@RequestParam("ids") List<Long> ids) {    log.info("删除套餐: {}", ids);    setmealService.deleteWithDish(ids);    return Result.success();}
```

**SetmealServiceImpl.java**

```
/** * 删除套餐, 同时删除套餐和菜品的关联数据 * @param ids 套餐id集合 */@Overridepublic void deleteWithDish(List<Long> ids) {    // 起售中的套餐不能删除    // 1. 查询套餐状态, 确认是否可以删除    for (Long id : ids) {        Setmeal setmeal = setmealMapper.getById(id);        if (setmeal != null && Objects.equals(setmeal.getStatus(), StatusConstant.ENABLE)) { // 套餐起售中            throw new DeletionNotAllowedException(MessageConstant.SETMEAL_ON_SALE);        }    }    // 2. 删除套餐表中的数据    // delete from setmeal where id in (1,2,3)    setmealMapper.deleteByIds(ids);    // 3. 删除套餐和菜品的关联数据    // delete from setmeal_dish where setmeal_id in (1,2,3)    setmealDishMapper.deleteBySetmealIds(ids);}
```

**SetmealMapper.java**

```
/** * 根据id查询套餐  (用于删除套餐时, 查询套餐状态) * @param id 套餐id */@Select("select * from setmeal where id = #{id}")Setmeal getById(Long id);/** * 根据id删除套餐 * @param ids 套餐id集合 */void deleteByIds(List<Long> ids);
```

**SetmealMapper.xml**

```
<delete id="deleteByIds" parameterType="list">    delete from setmeal where id in    <foreach collection="ids" item="id" open="(" separator="," close=")">        #{id}    </foreach></delete>
```

**SetmealDishMapper.java**

```
/** * 根据套餐id删除对应的套餐和菜品的关联关系 * @param setmealIds 套餐id集合 */void deleteBySetmealIds(List<Long> setmealIds);
```

**SetmealDishMapper.xml**

```
<delete id="deleteBySetmealIds">    delete from setmeal_dish where setmeal_id in    <foreach collection="setmealIds" item="setmealId" open="(" separator="," close=")">        #{setmealId}    </foreach></delete>
```

### 功能测试

起售中无法删除

![image-20251013135201884](/images/posts/image-20251013135201884.png)

删除成功

![image-20251013135207956](/images/posts/image-20251013135207956.png)

![image-20251013135259589](/images/posts/image-20251013135259589.png)

## 4. 修改套餐

### 需求分析与接口设计

**产品原型：**  
![image-20251013140428967](/images/posts/image-20251013140428967.png)

**接口设计（共涉及到5个接口）：**

* 根据id查询套餐
* 根据类型查询分类（已完成）
* 根据分类id查询菜品（已完成）
* 图片上传（已完成）
* 修改套餐

### 流程分析

### 代码编写

**SetmealController.java**

```
/** * 根据id查询套餐信息, 包括套餐和菜品的关联信息 * @param id 套餐id * @return 套餐信息 */@GetMapping("/{id}")@ApiOperation("根据id查询套餐信息(包括套餐和菜品的关联信息)")public Result<SetmealVO> getById(@PathVariable Long id) {  // 这里要加 @PathVariable 将路径参数中的id参数绑定到方法的id参数上    log.info("根据id查询套餐信息: {}", id);    SetmealVO setmealVO = setmealService.getByIdWithDishes(id);    return Result.success(setmealVO);}/** * 修改套餐(包括套餐和菜品的关联信息) * @param setmealDTO 套餐信息 * @return 结果 */@PutMapping@ApiOperation("修改套餐")public Result<Void> update(@RequestBody SetmealDTO setmealDTO) {  // 这里要加 @RequestBody 将前端传递的json数据转换为java对象    log.info("修改套餐: {}", setmealDTO);    setmealService.updateWithDish(setmealDTO);    return Result.success();}
```

**SetmealServiceImpl.java**

```
/** * 根据id查询套餐信息, 包括套餐和菜品的关联信息 * @param id 套餐id * @return 套餐信息 */@Overridepublic SetmealVO getByIdWithDishes(Long id) {    // 1. 查询套餐基本信息    Setmeal setmeal = setmealMapper.getById(id);    // 2. 查询套餐和菜品的关联信息    List<SetmealDish> setmealDishes = setmealDishMapper.getByIdWithDishes(id);    // 3. 将套餐基本信息与套餐菜品信息封装到VO对象中并返回    SetmealVO setmealVO = new SetmealVO();    BeanUtils.copyProperties(setmeal, setmealVO);    setmealVO.setSetmealDishes(setmealDishes);    return setmealVO;}/** * 修改套餐(包括套餐和菜品的关联信息) * @param setmealDTO 套餐信息 */@Overridepublic void updateWithDish(SetmealDTO setmealDTO) {    Setmeal setmeal = new Setmeal();    BeanUtils.copyProperties(setmealDTO, setmeal);    // 1. 首先，更新setmeal表中的基本信息    setmealMapper.updateById(setmeal);    // 2. 然后，更新setmeal_dish表中的关联信息    Long setmealId = setmeal.getId();    // 2.1 先删除原有的关联信息    setmealDishMapper.deleteBySetmealIds(List.of(setmealId));    // 2.2 再重新插入新的关联信息    List<SetmealDish> setmealDishes = setmealDTO.getSetmealDishes();    // 设置套餐id    setmealDishes.forEach(setmealDish -> setmealDish.setSetmealId(setmealId));    // 批量插入套餐和菜品的关联关系    setmealDishMapper.insertBatch(setmealDishes);}
```

**SetmealMapper.java**

```
/** * 根据id动态修改套餐信息 * @param setmeal 套餐信息 */@AutoFill(value = OperationType.UPDATE)void updateById(Setmeal setmeal);
```

**SetmealMapper.xml**

```
<update id="updateById">    update setmeal    <set>        <if test="categoryId != null">category_id = #{categoryId},</if>        <if test="name != null">name = #{name},</if>        <if test="price != null">price = #{price},</if>        <if test="status != null">status = #{status},</if>        <if test="description != null">description = #{description},</if>        <if test="image != null">image = #{image},</if>        update_time = #{updateTime},        update_user = #{updateUser}    </set>    where id = #{id}</update>
```

**SetmealDishMapper.java**

```
/** * 根据套餐id查询对应的套餐和菜品的关联关系 * @param setmealId 套餐id * @return 套餐和菜品的关联关系 */@Select("select * from setmeal_dish where setmeal_id = #{setmealId}")List<SetmealDish> getByIdWithDishes(Long setmealId);
```

### 功能测试

![image-20251013152423948](/images/posts/image-20251013152423948.png)

![image-20251013152426440](/images/posts/image-20251013152426440.png)

## 5. 起售停售套餐

### 需求分析与接口设计

业务规则：

* 可以对状态为起售的套餐进行停售操作，可以对状态为停售的套餐进行起售操作
* 起售的套餐可以展示在用户端，停售的套餐不能展示在用户端
* 起售套餐时，如果套餐内包含停售的菜品，则不能起售

**接口设计：**  
![image-20251013162309637](/images/posts/image-20251013162309637.png)

### 流程分析

### 代码编写

**SetmealController**

```
/** * 起售/停售套餐 * @param status 状态 * @param id 套餐id集合 * @return 结果 */@PostMapping("/status/{status}")@ApiOperation("起售/停售套餐")public Result<Void> startOrStop(@PathVariable Integer status, Long id) {    log.info("起售/停售套餐: {}, {}", status, id);    setmealService.startOrStop(status, id);    return Result.success();}
```

**SetmealServiceImpl**

```
/** * 起售/停售套餐 * @param status 套餐状态 * @param id 套餐id */@Overridepublic void startOrStop(Integer status, Long id) {    // 如果要设置为起售，需要检查套餐内的菜品是否都为起售状态    if (Objects.equals(status, StatusConstant.ENABLE)) { // 要起售        // select a.* from dish a        // left join setmeal_dish b on a.id = b.dish_id where b.setmeal_id = ?;        List<Dish> dishList = dishMapper.getBySetmealId(id); // 查询套餐内的菜品        dishList.forEach(dish -> {            if (dish.getStatus().equals(StatusConstant.DISABLE)) {                throw new SetmealEnableFailedException(MessageConstant.SETMEAL_ENABLE_FAILED);            }        }); // 只要有一个菜品是停售状态, 就不能起售    }    // 可以起售，更新套餐状态    Setmeal setmeal = Setmeal.builder()            .id(id)            .status(status)            .build();    setmealMapper.updateById(setmeal);}
```

**DishMapper**

```
/** * 根据套餐id查询对应的菜品 * @param id 套餐id * @return 菜品列表 */@Select("select d.* from dish d " +        "left join setmeal_dish sd on d.id = sd.dish_id " +        "where sd.setmeal_id = #{id} ")List<Dish> getBySetmealId(Long id);
```

### 功能测试

![image-20251013170117923](/images/posts/image-20251013170117923.png)

![image-20251013170122129](/images/posts/image-20251013170122129.png)
